#version 300 es
precision highp float;

uniform sampler2D uPalette;
uniform sampler2D uAtlas;
uniform sampler2D uAffiliation;   // 256×2 RGBA8 — row 1 = unit affiliation
uniform float uTime;
uniform float uDotsThreshold;
uniform float uGhostAlpha;       // 1.0 = normal, <1.0 = ghost transparency
uniform vec3  uOutlineColor;     // ghost outline color (vec3(0) = no outline)
uniform int   uAltView;
uniform int   uHighlightMask;   // bitmask of atlas columns to highlight (0 = off)
uniform float uHighlightOutlineW; // outline width for highlighted structures
uniform float uHighlightDimAlpha; // alpha multiplier for non-highlighted structures
uniform float uFillDarken;      // HSV value multiplier on icon fill
uniform float uBorderDarken;    // HSV value multiplier on icon border
uniform float uIconAlpha;       // global multiplier on final icon alpha
uniform vec3  uIconColor;       // color of the inner icon glyph (was white)
uniform float uIconDarken;      // >0: glyph = darkened player color instead of uIconColor
uniform float uLocalPlayerID;

in vec2  vLocalPos;
in vec2  vAtlasUV;
flat in float vOwnerID;
flat in float vUnderConstruction;
flat in float vMarkedForDeletion;
flat in float vZoom;
flat in float vAtlasIdx;
flat in float vShapeScale;
flat in float vLevel;

out vec4 fragColor;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

vec3 darken(vec3 rgb, float vScale) {
  vec3 hsv = rgb2hsv(rgb);
  hsv.z *= vScale;
  return hsv2rgb(hsv);
}

#define PI 3.14159265

// Signed distance to regular polygon edge.
// R = circumradius (center-to-vertex), n = sides, rot = rotation in radians.
// Returns negative inside, positive outside.
float sdPolygon(vec2 p, float R, float n, float rot) {
  float an = PI / n;
  float a = atan(p.y, p.x) - rot;
  a = mod(a + an, 2.0 * an) - an;
  return length(p) * cos(a) - R * cos(an);
}

float boxMask(vec2 p, vec2 center, vec2 halfSize, float softness) {
  vec2 d = abs(p - center) - halfSize;
  float outside = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  return 1.0 - smoothstep(0.0, softness, outside);
}

float lineMask(vec2 p, vec2 a, vec2 b, float width) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  float d = length(p - (a + ab * t));
  return 1.0 - smoothstep(width, width + fwidth(d) * 2.0, d);
}

float cityGlyph(vec2 p, float level) {
  float soft = max(0.008, fwidth(p.x) * 1.5);
  float m = boxMask(p, vec2(0.0, 0.10), vec2(0.095, 0.23), soft);
  if (level >= 2.0) m = max(m, boxMask(p, vec2(-0.17, 0.16), vec2(0.08, 0.17), soft));
  if (level >= 3.0) m = max(m, boxMask(p, vec2(0.17, 0.18), vec2(0.08, 0.15), soft));
  if (level >= 4.0) m = max(m, boxMask(p, vec2(-0.03, -0.10), vec2(0.18, 0.08), soft));
  if (level >= 5.0) m = max(m, boxMask(p, vec2(0.04, 0.36), vec2(0.025, 0.09), soft));
  if (level >= 6.0) m = max(m, boxMask(p, vec2(0.29, 0.08), vec2(0.045, 0.20), soft));
  return m;
}

float cityWindows(vec2 p, float level) {
  float rows = step(0.0, sin((p.y + 0.44) * 58.0));
  float cols = step(0.75, sin((p.x + 0.41) * 82.0));
  float twinkle = 0.55 + 0.45 * sin(uTime * 2.0 + p.x * 19.0 + p.y * 23.0);
  return cityGlyph(p, level) * rows * cols * twinkle;
}

float portGlyph(vec2 p, float level) {
  float soft = max(0.008, fwidth(p.x) * 1.5);
  float dock = boxMask(p, vec2(-0.02, -0.12), vec2(0.30, 0.055), soft);
  float pier1 = boxMask(p, vec2(-0.20, 0.06), vec2(0.04, 0.17), soft);
  float pier2 = boxMask(p, vec2(0.10, 0.04), vec2(0.04, 0.15), soft);
  float crane = 0.0;
  if (level >= 3.0) {
    crane = max(lineMask(p, vec2(0.23, -0.12), vec2(0.23, 0.24), 0.018),
      lineMask(p, vec2(0.20, 0.20), vec2(0.38, 0.16), 0.014));
  }
  return max(max(dock, max(pier1, pier2)), crane);
}

float constructionGlyph(vec2 p) {
  float soft = max(0.008, fwidth(p.x) * 1.5);
  float stride = fract(uTime * 1.4);
  float workerA = boxMask(p, vec2(-0.17 + stride * 0.08, 0.14), vec2(0.035, 0.075), soft)
    + boxMask(p, vec2(-0.17 + stride * 0.08, 0.245), vec2(0.042, 0.042), soft);
  float workerB = boxMask(p, vec2(0.17 - stride * 0.08, -0.04), vec2(0.035, 0.075), soft)
    + boxMask(p, vec2(0.17 - stride * 0.08, 0.065), vec2(0.042, 0.042), soft);
  float hammer = lineMask(p, vec2(-0.02, 0.22), vec2(0.12, 0.33 + sin(uTime * 6.0) * 0.04), 0.015);
  float scaffold = lineMask(p, vec2(-0.28, -0.23), vec2(0.28, 0.27), 0.012)
    + lineMask(p, vec2(-0.28, 0.27), vec2(0.28, -0.23), 0.012);
  return clamp(workerA + workerB + hammer + scaffold * 0.7, 0.0, 1.0);
}

// Per-structure-type shape SDF.
// Atlas indices: 0=City, 1=Port, 2=Factory, 3=DefensePost, 4=SAM, 5=Silo
float shapeSDF(vec2 p, float R) {
  if (vAtlasIdx < 0.5)
    return length(p) - R;                     // City → circle
  if (vAtlasIdx < 1.5)
    return sdPolygon(p, R, 5.0, PI * 0.5);    // Port → pentagon (vertex up)
  if (vAtlasIdx < 2.5)
    return sdPolygon(p, R, 6.0, PI / 6.0);    // Factory → hexagon (flat top)
  if (vAtlasIdx < 3.5)
    return sdPolygon(p, R, 8.0, 0.0);         // Defense Post → octagon (flat top)
  if (vAtlasIdx < 4.5)
    return sdPolygon(p, R, 4.0, 0.0);         // SAM Launcher → square (flat sides)
  return sdPolygon(p, R, 3.0, PI * 0.5);      // Missile Silo → triangle (vertex up)
}

void main() {
  float dist = length(vLocalPos);
  float radius = 0.45;
  float borderWidth = 0.06 / vShapeScale;

  float sdf = shapeSDF(vLocalPos, radius);
  float fw = fwidth(dist);

  // When highlight is active, expand the region to include the outer outline band.
  float highlightOutlineW = uHighlightMask != 0 ? uHighlightOutlineW / vShapeScale : 0.0;
  float outerAlpha = 1.0 - smoothstep(-fw, fw, sdf - highlightOutlineW);

  if (outerAlpha <= 0.0) discard;

  float borderMask = 1.0 - smoothstep(-fw, fw, sdf + borderWidth);

  // Player color
  vec4 fillColor;
  vec4 borderColor;

  if (uAltView != 0 && vUnderConstruction < 0.5) {
    vec3 ac = texelFetch(uAffiliation, ivec2(int(vOwnerID), 1), 0).rgb;
    fillColor = vec4(darken(ac, uFillDarken), 1.0);
    borderColor = vec4(darken(ac, uBorderDarken), 1.0);
  } else if (vUnderConstruction > 0.5) {
    fillColor = vec4(198.0/255.0, 198.0/255.0, 198.0/255.0, 1.0);
    borderColor = vec4(127.0/255.0, 127.0/255.0, 127.0/255.0, 1.0);
  } else {
    int owner = int(vOwnerID + 0.5);
    int local = int(uLocalPlayerID);
    float u = (vOwnerID + 0.5) / float(PALETTE_SIZE);
    fillColor = texture(uPalette, vec2(u, 0.25));
    // if local player, use territory color because the border color is grey
    borderColor = texture(uPalette, vec2(u, owner == local ? 0.25 : 0.75));
    // Darken via HSV value so hue/saturation stay intact
    // vScale < 1.0 = darker, > 1.0 = brighter
    fillColor.rgb = darken(fillColor.rgb, uFillDarken);
    borderColor.rgb = darken(borderColor.rgb, uBorderDarken);
    fillColor.a = 1.0;
    borderColor.a = 1.0;
  }

  vec4 bgColor = mix(borderColor, fillColor, borderMask);

  // Sample icon from atlas (white on transparent)
  // Only show icon detail when zoomed in enough
  float iconAlpha = 0.0;
  if (vZoom > uDotsThreshold) {
    // Clamp UV to this atlas column to prevent bleeding into neighbours
    // when uIconFill shrinks the icon (expanding UV range beyond column).
    float colStart = vAtlasIdx / float(ATLAS_COLS);
    float colEnd = (vAtlasIdx + 1.0) / float(ATLAS_COLS);
    vec2 safeUV = vec2(clamp(vAtlasUV.x, colStart, colEnd), clamp(vAtlasUV.y, 0.0, 1.0));
    vec4 iconSample = texture(uAtlas, safeUV);
    // Zero out icon outside the valid UV region (clamped pixels would repeat the edge)
    float inBounds = step(colStart, vAtlasUV.x) * step(vAtlasUV.x, colEnd)
                   * step(0.0, vAtlasUV.y) * step(vAtlasUV.y, 1.0);
    // Clip to fill area so icon doesn't bleed into the border ring.
    iconAlpha = iconSample.a * borderMask * inBounds;
  }

  // Composite: tinted icon over player-colored shape.
  // Classic icons (uIconDarken > 0) tint the glyph with a darkened player
  // color. When the shape itself is already dark, that darkened glyph blends
  // into the shape (and the dark territory behind it) and becomes unreadable —
  // so flip the glyph to the light icon color when the fill is too dark.
  vec3 glyphColor = uIconColor;
  if (uIconDarken > 0.0) {
    float fillLum = dot(fillColor.rgb, vec3(0.299, 0.587, 0.114));
    glyphColor = fillLum < 0.25 ? uIconColor : darken(fillColor.rgb, uIconDarken);
  }
  vec3 finalRGB = mix(bgColor.rgb, glyphColor, iconAlpha);

  if (vZoom > uDotsThreshold) {
    if (vAtlasIdx < 0.5) {
      float buildings = cityGlyph(vLocalPos, vLevel) * borderMask;
      float windows = cityWindows(vLocalPos, vLevel) * borderMask;
      vec3 buildingColor = darken(fillColor.rgb, 0.32);
      vec3 windowColor = mix(vec3(1.0, 0.78, 0.32), vec3(0.70, 0.92, 1.0), step(4.0, vLevel));
      finalRGB = mix(finalRGB, buildingColor, buildings * 0.95);
      finalRGB = mix(finalRGB, windowColor, windows * 0.85);
    } else if (vAtlasIdx > 0.5 && vAtlasIdx < 1.5) {
      float dock = portGlyph(vLocalPos, vLevel) * borderMask;
      vec3 dockColor = mix(darken(fillColor.rgb, 0.30), vec3(0.10, 0.07, 0.04), 0.35);
      finalRGB = mix(finalRGB, dockColor, dock * 0.95);
    }

    if (vUnderConstruction > 0.5) {
      float build = constructionGlyph(vLocalPos) * borderMask;
      vec3 vest = mix(vec3(1.0, 0.72, 0.08), vec3(0.95, 0.95, 0.95), step(0.7, fract(uTime * 5.0)));
      finalRGB = mix(finalRGB, vest, build * 0.9);
    }
  }

  // Red X overlay for units marked for deletion
  if (vMarkedForDeletion > 0.5) {
    float lineW = max(0.025, fw * 1.5);
    float d1 = abs(vLocalPos.x - vLocalPos.y) * 0.7071; // dist to y=x diagonal
    float d2 = abs(vLocalPos.x + vLocalPos.y) * 0.7071; // dist to y=-x diagonal
    float dMin = min(d1, d2);
    // Extend arms close to the circle edge
    float maskR = max(radius * 1.55, fw * 6.0);
    float mask = 1.0 - smoothstep(maskR - fw, maskR, dist);
    float xLine = (1.0 - smoothstep(lineW - fw, lineW + fw, dMin)) * mask;
    finalRGB = mix(finalRGB, vec3(1.0, 0.25, 0.25), xLine * 0.95);
  }

  // Ghost tint — blend entire surface toward uOutlineColor when non-zero
  float tintActive = step(0.01, dot(uOutlineColor, uOutlineColor));
  finalRGB = mix(finalRGB, uOutlineColor, tintActive * 0.5);

  float finalAlpha = bgColor.a * outerAlpha * uGhostAlpha * uIconAlpha;

  // Build-button hover highlight: white outline on matching types, dim the rest
  if (uHighlightMask != 0) {
    int bit = 1 << int(vAtlasIdx + 0.5);
    if ((uHighlightMask & bit) != 0) {
      // White outline band outside the shape edge (matches game's OutlineFilter)
      float shapeEdge = 1.0 - smoothstep(-fw, fw, sdf);           // 1 inside shape, 0 outside
      float expandedEdge = 1.0 - smoothstep(-fw, fw, sdf - highlightOutlineW); // includes outline band
      float outlineBand = expandedEdge - shapeEdge;                // 1 in outline region only
      finalRGB = mix(finalRGB, vec3(1.0), outlineBand);
      finalAlpha = max(finalAlpha, outlineBand);
    } else {
      finalAlpha *= uHighlightDimAlpha;
    }
  }

  fragColor = vec4(finalRGB, finalAlpha);
}
