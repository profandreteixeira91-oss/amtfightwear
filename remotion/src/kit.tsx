import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { BRAND } from "./brand";

/** unidade responsiva: 1u = 1% da menor dimensão */
export function useUnit() {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 100;
  const portrait = height > width * 1.1;
  const square = !portrait && Math.abs(width - height) < width * 0.15;
  return { u, portrait, square, width, height, landscape: !portrait && !square };
}

export function Backdrop({ image, zoom = true }: { image?: string; zoom?: boolean }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = zoom ? interpolate(frame, [0, durationInFrames], [1.06, 1.2]) : 1.1;
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, overflow: "hidden" }}>
      {image && (
        <AbsoluteFill style={{ transform: `scale(${scale})` }}>
          <Img
            src={staticFile(`images/${image}`)}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.42 }}
          />
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at 20% 0%, rgba(220,38,38,0.30) 0%, rgba(10,5,6,0) 55%), linear-gradient(180deg, rgba(10,5,6,0.55) 0%, rgba(10,5,6,0.88) 62%, #0A0506 100%)`,
        }}
      />
      <Grain />
    </AbsoluteFill>
  );
}

function Grain() {
  const { u } = useUnit();
  return (
    <AbsoluteFill style={{ opacity: 0.16 }}>
      {Array.from({ length: 26 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${(i * 4.1) % 100}%`,
            left: 0,
            width: "100%",
            height: 1,
            background: i % 2 ? "rgba(247,242,240,0.06)" : "rgba(220,38,38,0.08)",
          }}
        />
      ))}
      <div style={{ position: "absolute", inset: u * 2.4, border: `${Math.max(1, u * 0.16)}px solid rgba(247,242,240,0.10)` }} />
    </AbsoluteFill>
  );
}

/** entrada padrão: sobe + revela */
export function Rise({
  delay = 0,
  children,
  style,
}: {
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const y = interpolate(s, [0, 1], [34, 0]);
  return (
    <div style={{ ...style, opacity: s, transform: `translateY(${y}px)` }}>{children}</div>
  );
}

export function Eyebrow({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { u } = useUnit();
  return (
    <Rise delay={delay}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: u * 1.2,
          color: BRAND.redBright,
          fontFamily: "var(--body)",
          fontWeight: 700,
          fontSize: u * 2.1,
          letterSpacing: u * 0.32,
          textTransform: "uppercase",
        }}
      >
        <span style={{ width: u * 5, height: u * 0.3, background: BRAND.red }} />
        {children}
      </div>
    </Rise>
  );
}

export function Headline({
  children,
  delay = 0,
  size = 9,
}: {
  children: React.ReactNode;
  delay?: number;
  size?: number;
}) {
  const { u } = useUnit();
  return (
    <Rise delay={delay}>
      <h1
        style={{
          margin: 0,
          color: BRAND.cream,
          fontFamily: "var(--display)",
          fontSize: u * size,
          lineHeight: 1.02,
          letterSpacing: -u * 0.08,
          textTransform: "uppercase",
        }}
      >
        {children}
      </h1>
    </Rise>
  );
}

export function Red({ children }: { children: React.ReactNode }) {
  return <span style={{ color: BRAND.redBright }}>{children}</span>;
}

export function Body({ children, delay = 0, size = 2.7 }: { children: React.ReactNode; delay?: number; size?: number }) {
  const { u } = useUnit();
  return (
    <Rise delay={delay}>
      <p
        style={{
          margin: 0,
          color: BRAND.muted,
          fontFamily: "var(--body)",
          fontWeight: 500,
          fontSize: u * size,
          lineHeight: 1.42,
          maxWidth: u * 62,
        }}
      >
        {children}
      </p>
    </Rise>
  );
}

export function Frame({ children, align = "flex-start" }: { children: React.ReactNode; align?: "flex-start" | "center" }) {
  const { u } = useUnit();
  return (
    <AbsoluteFill
      style={{
        padding: u * 9,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: align,
        textAlign: align === "center" ? "center" : "left",
        gap: u * 2.6,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

export function LogoBar() {
  const { u } = useUnit();
  return (
    <div style={{ position: "absolute", top: u * 5.4, left: u * 5.6, display: "flex", alignItems: "center", gap: u * 1.6 }}>
      <Img
        src={staticFile("images/amt-fightwear-logo-white.jpg")}
        style={{ height: u * 6, mixBlendMode: "screen", objectFit: "contain" }}
      />
    </div>
  );
}
