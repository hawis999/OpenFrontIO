#version 300 es
precision highp float;

uniform sampler2D uPalette;
uniform sampler2D uAtlas;
uniform sampler2D uAffiliation;   // 256×2 RGBA8 — row 1 = unit affiliation
uniform float uTick;
uniform float uFlickerSpeed;
uniform vec3  uAngryColor;
uniform int   uAltView;
uniform vec3  uHBombGlowColor;
uniform float uHBombGlowStrength;
uniform float uHBombGlowInner;
uniform float uUntargetableAlpha;

in vec2  vQuadPos;
in vec2  vCellUV;
flat in float vAtlasCol;
flat in float vOwnerID;
flat in float vFlags;
flat in float vHash;
flat in float vGlow;

out vec4 fragColor;

// Flag constants — must match CPU-side FLAG_* values
const float FLAG_FLICKER        = 1.0;
const float FLAG_ANGRY          = 2.0;
const float FLAG_TRADE_FRIENDLY = 3.0;
const float FLAG_RETREATING     = 4.0;
const float FLAG_FLICKER_UNTARGETABLE = 5.0; // nuke out of SAM range — dimmed

// Ally color for trade-friendly override (yellow — matches affiliation.ts ALLY)
const vec3 ALLY_COLOR = vec3(1.0, 1.0, 0.0);

// Flicker hot colors: red → orange → yellow → white
const vec3 FLICKER_COLORS[4] = vec3[4](
  vec3(1.0, 0.0, 0.0),   // red
  vec3(1.0, 0.5, 0.0),   // orange
  vec3(1.0, 1.0, 0.0),   // yellow
  vec3(1.0, 1.0, 1.0)    // white
);

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

float triangleMask(vec2 p, vec2 a, vec2 b, vec2 c, float softness) {
  vec2 e0 = b - a;
  vec2 e1 = c - b;
  vec2 e2 = a - c;
  float s0 = e0.x * (p.y - a.y) - e0.y * (p.x - a.x);
  float s1 = e1.x * (p.y - b.y) - e1.y * (p.x - b.x);
  float s2 = e2.x * (p.y - c.y) - e2.y * (p.x - c.x);
  float inside = min(min(s0, s1), s2);
  return smoothstep(-softness, softness, inside);
}

vec4 cargoShipSprite(vec2 uv) {
  vec2 p = uv - 0.5;
  float soft = max(0.012, fwidth(p.x) * 1.5);
  float hull = boxMask(p, vec2(0.0, -0.12), vec2(0.36, 0.085), soft);
  hull = max(hull, triangleMask(p, vec2(0.34, -0.205), vec2(0.48, -0.12), vec2(0.34, -0.035), soft));
  float cabin = boxMask(p, vec2(-0.20, 0.03), vec2(0.09, 0.10), soft);
  float stack = boxMask(p, vec2(-0.29, 0.15), vec2(0.035, 0.07), soft);
  float c1 = boxMask(p, vec2(-0.03, 0.02), vec2(0.085, 0.08), soft);
  float c2 = boxMask(p, vec2(0.15, 0.02), vec2(0.085, 0.08), soft);
  float wave = lineMask(p, vec2(-0.42, -0.27), vec2(0.42, -0.27), 0.018);
  float alpha = clamp(hull + cabin + stack + c1 + c2 + wave * 0.55, 0.0, 1.0);
  float gray = mix(0.70, 0.27, max(wave, max(stack, boxMask(p, vec2(0.0, -0.20), vec2(0.35, 0.025), soft))));
  gray = mix(gray, 0.51, max(c1, c2));
  return vec4(vec3(gray), alpha);
}

vec4 battleshipSprite(vec2 uv) {
  vec2 p = uv - 0.5;
  float soft = max(0.010, fwidth(p.x) * 1.5);
  float hull = boxMask(p, vec2(0.0, -0.10), vec2(0.38, 0.08), soft);
  hull = max(hull, triangleMask(p, vec2(0.34, -0.18), vec2(0.50, -0.10), vec2(0.34, -0.02), soft));
  float deck = boxMask(p, vec2(-0.02, 0.02), vec2(0.25, 0.045), soft);
  float turretA = boxMask(p, vec2(-0.17, 0.105), vec2(0.07, 0.055), soft);
  float turretB = boxMask(p, vec2(0.07, 0.115), vec2(0.065, 0.055), soft);
  float bridge = boxMask(p, vec2(-0.02, 0.20), vec2(0.055, 0.08), soft);
  float barrelA = lineMask(p, vec2(-0.12, 0.13), vec2(0.17, 0.22), 0.018);
  float barrelB = lineMask(p, vec2(0.12, 0.14), vec2(0.36, 0.20), 0.016);
  float wake = lineMask(p, vec2(-0.44, -0.26), vec2(0.22, -0.26), 0.014);
  float alpha = clamp(hull + deck + turretA + turretB + bridge + barrelA + barrelB + wake * 0.45, 0.0, 1.0);
  float gray = mix(0.70, 0.27, max(wake, boxMask(p, vec2(0.0, -0.18), vec2(0.34, 0.025), soft)));
  gray = mix(gray, 0.39, max(turretA, max(turretB, bridge)));
  gray = mix(gray, 0.51, max(barrelA, barrelB));
  return vec4(vec3(gray), alpha);
}

void main() {
  // Untargetable nukes render translucent so players know SAMs can't hit them
  float alphaMul = abs(vFlags - FLAG_FLICKER_UNTARGETABLE) < 0.1
    ? uUntargetableAlpha
    : 1.0;

  // The sprite lives in the central cell-space region [0,1]; for the enlarged
  // hydrogen-bomb quad, anything outside that range is glow-only margin.
  vec4 texel = vec4(0.0);
  bool inSprite = vCellUV.x >= 0.0 && vCellUV.x <= 1.0 &&
                  vCellUV.y >= 0.0 && vCellUV.y <= 1.0;
  if (inSprite) {
    vec2 atlasUV = vec2((vAtlasCol + vCellUV.x) / float(ATLAS_COLS), vCellUV.y);
    texel = texture(uAtlas, atlasUV);
  }

  if (abs(vAtlasCol - 1.0) < 0.1) {
    texel = cargoShipSprite(vCellUV);
  } else if (abs(vAtlasCol - 2.0) < 0.1) {
    texel = battleshipSprite(vCellUV);
  }

  // Outside the sprite: render the steady soft glow under the hydrogen bomb,
  // otherwise discard. Glow is suppressed in alt (affiliation) view.
  if (texel.a < 0.01) {
    if (vGlow > 0.5 && uAltView == 0) {
      float d = length(vQuadPos - 0.5) * 2.0; // 0 at center → ~1 at quad edge
      float g = (1.0 - smoothstep(uHBombGlowInner, 1.0, d)) * uHBombGlowStrength;
      if (g > 0.001) {
        fragColor = vec4(uHBombGlowColor, g * alphaMul);
        return;
      }
    }
    discard;
  }

  float gray = texel.r;

  // Alt-view: solid affiliation color, no gray-replacement bands
  if (uAltView != 0) {
    // Enemy trade ships heading to a self/allied port render as yellow (ally)
    vec3 ac = abs(vFlags - FLAG_TRADE_FRIENDLY) < 0.1
      ? ALLY_COLOR
      : texelFetch(uAffiliation, ivec2(int(vOwnerID), 1), 0).rgb;
    fragColor = vec4(ac, texel.a * alphaMul);
    return;
  }

  // Player color lookup from palette
  float u = (vOwnerID + 0.5) / float(PALETTE_SIZE);
  vec3 territoryColor = texture(uPalette, vec2(u, 0.25)).rgb;
  vec3 borderColor    = texture(uPalette, vec2(u, 0.75)).rgb;

  // Flag states (uint8 passed as float via vertex attribute):
  //   0 = normal
  //   1 = flicker (nukes/warheads — cycling hot colors)
  //   2 = angry (warships attacking — outer ring (180 band) solid red)
  //   4 = retreating (warships fleeing to port — blinking black center)
  float retreatBlink = 0.0;
  if (abs(vFlags - FLAG_ANGRY) < 0.1) {
    // Angry: the outer ring (180) and center (100) go red via territoryColor
    territoryColor = uAngryColor;
  } else if (abs(vFlags - FLAG_RETREATING) < 0.1) {
    // Retreating: slowly blink the center (100 band) black so the ship reads as fleeing
    retreatBlink = step(0.5, fract(uTick * 0.07));
  } else if (abs(vFlags - FLAG_FLICKER) < 0.1 ||
             abs(vFlags - FLAG_FLICKER_UNTARGETABLE) < 0.1) {
    // Flicker: cycle through hot colors, offset by position hash
    float phase = fract(uTick * uFlickerSpeed + vHash);
    int idx = int(phase * 4.0) % 4;
    territoryColor = FLICKER_COLORS[idx];
    borderColor = FLICKER_COLORS[(idx + 2) % 4];
  }

  // Four-band gray replacement:
  //   180/255 ~ 0.706 -> territory color (light band)
  //   130/255 ~ 0.510 -> spawn/mid color (interpolated; used by missiles)
  //   100/255 ~ 0.392 -> center accent (warship center — tracks ring, blinks black)
  //   70/255  ~ 0.275 -> border color (dark band)
  vec3 spawnColor = mix(territoryColor, borderColor, 0.5);
  vec3 centerColor = mix(territoryColor, vec3(0.0), retreatBlink);

  vec3 color;
  if (gray > 0.6) {
    // Light band (180) -> territory color
    color = territoryColor;
  } else if (gray > 0.45) {
    // Mid band (130) -> spawn color
    color = spawnColor;
  } else if (gray > 0.34) {
    // Center accent band (100) -> center color
    color = centerColor;
  } else {
    // Dark band (70) -> border color
    color = borderColor;
  }

  fragColor = vec4(color, texel.a * alphaMul);
}
