#version 300 es
precision highp float;

uniform float uTime;        // seconds, for rotation
uniform float uRingWidth;   // line thickness in normalized coords

in vec2  vLocalPos;
flat in float vAlpha;

out vec4 fragColor;

const float INNER_R = 0.5;
const float OUTER_R = 0.8;
const float INNER_DASHES = 8.0;
const float OUTER_DASHES = 2.0;
const float PI = 3.14159265;

float lineMask(vec2 p, vec2 a, vec2 b, float width) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  float d = length(p - (a + ab * t));
  return 1.0 - smoothstep(width, width + fwidth(d) * 2.0, d);
}

void main() {
  float dist = length(vLocalPos);
  float angle = atan(vLocalPos.y, vLocalPos.x);

  // Inner ring — thin, many dashes, rotating clockwise
  float innerDist = abs(dist - INNER_R);
  float innerRing = 1.0 - smoothstep(0.0, uRingWidth * 2.0, innerDist);
  float innerAngle = angle + uTime * 1.2;
  float innerDash = smoothstep(0.4, 0.5, abs(fract(innerAngle * INNER_DASHES / (2.0 * PI)) - 0.5) * 2.0);
  innerRing *= innerDash;

  // Outer ring — thick, few dashes, counter-rotating
  float outerDist = abs(dist - OUTER_R);
  float outerRing = 1.0 - smoothstep(0.0, uRingWidth * 3.0, outerDist);
  float outerAngle = angle - uTime * 0.6;
  float outerDash = smoothstep(0.3, 0.4, abs(fract(outerAngle * OUTER_DASHES / (2.0 * PI)) - 0.5) * 2.0);
  outerRing *= outerDash;

  float phase = fract(uTime * 1.8);
  float tracerA = lineMask(vLocalPos, vec2(-0.92, -0.34), vec2(0.62, 0.24), 0.030);
  tracerA *= smoothstep(0.05, 0.18, phase) * (1.0 - smoothstep(0.42, 0.62, phase));
  float tracerB = lineMask(vLocalPos, vec2(0.86, -0.22), vec2(-0.48, 0.36), 0.024);
  tracerB *= smoothstep(0.52, 0.64, phase) * (1.0 - smoothstep(0.78, 0.95, phase));
  float tracerC = lineMask(vLocalPos, vec2(-0.62, 0.62), vec2(0.30, -0.12), 0.020);
  tracerC *= smoothstep(0.28, 0.38, phase) * (1.0 - smoothstep(0.48, 0.66, phase));

  float muzzleA = 1.0 - smoothstep(0.06, 0.18, length(vLocalPos - vec2(-0.85, -0.31)));
  muzzleA *= step(phase, 0.16);
  float muzzleB = 1.0 - smoothstep(0.05, 0.16, length(vLocalPos - vec2(0.80, -0.20)));
  muzzleB *= step(abs(phase - 0.55), 0.08);

  float ring = max(innerRing, outerRing);
  float fire = max(max(tracerA, tracerB), max(tracerC, max(muzzleA, muzzleB)));
  if (max(ring, fire) < 0.01) discard;

  vec3 ringColor = vec3(1.0, 0.05, 0.02);
  vec3 fireColor = mix(vec3(1.0, 0.22, 0.05), vec3(1.0, 0.90, 0.25), fire);
  vec3 color = mix(ringColor, fireColor, step(0.02, fire));
  fragColor = vec4(color, max(ring * 0.85, fire) * vAlpha);
}
