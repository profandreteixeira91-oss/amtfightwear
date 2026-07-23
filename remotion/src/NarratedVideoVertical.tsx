import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Backdrop } from "./Backdrop";
import { colors, sans } from "./theme";

const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

type Beat = {
  start: number;
  end: number;
  eyebrow?: string;
  title?: string;
  caption: string;
  screenshot?: string;
  layout: "intro" | "brand" | "showcase" | "grid" | "outro";
  gridScreens?: string[];
};

const beats: Beat[] = [
  {
    start: 0,
    end: 4.3,
    layout: "intro",
    eyebrow: "AMT Dojo Manager",
    title: "Gestão sem esforço.",
    caption: "Administrar uma academia exige muito mais do que dar boas aulas.",
  },
  {
    start: 4.3,
    end: 12.6,
    layout: "intro",
    eyebrow: "Do tatame ao caixa",
    title: "Tudo em um só lugar.",
    caption: "Alunos, financeiro, graduações e operação — em perfeita sintonia.",
  },
  {
    start: 12.6,
    end: 18.2,
    layout: "brand",
    caption: "Uma plataforma completa para a gestão da sua academia.",
  },
  {
    start: 18.2,
    end: 22.5,
    layout: "showcase",
    eyebrow: "01 · Dashboard",
    title: "Visão completa em tempo real",
    caption: "Dashboard moderno e intuitivo com a saúde do seu dojo em um relance.",
    screenshot: "screens/dashboard.png",
  },
  {
    start: 22.5,
    end: 30.8,
    layout: "showcase",
    eyebrow: "02 · Alunos",
    title: "Ficha 360° do atleta",
    caption: "Cadastro, documentos, avaliações e evolução — todo o histórico num só lugar.",
    screenshot: "screens/students.png",
  },
  {
    start: 30.8,
    end: 38.5,
    layout: "showcase",
    eyebrow: "03 · Financeiro",
    title: "Motor financeiro seguro",
    caption: "Mensalidades, recebimentos, despesas e indicadores em tempo real.",
    screenshot: "screens/finance.png",
  },
  {
    start: 38.5,
    end: 45.0,
    layout: "showcase",
    eyebrow: "04 · Graduações & Certificados",
    title: "Do branco ao preto",
    caption: "Organize graduações, registre históricos e emita certificados em poucos cliques.",
    screenshot: "screens/graduations.png",
  },
  {
    start: 45.0,
    end: 51.0,
    layout: "showcase",
    eyebrow: "05 · Check-in & Ranking",
    title: "Presença que vira desempenho",
    caption: "Frequência, check-ins geolocalizados e rankings inteligentes por turma.",
    screenshot: "screens/ranking.png",
  },
  {
    start: 51.0,
    end: 60.3,
    layout: "showcase",
    eyebrow: "06 · PWA do Aluno",
    title: "Sua academia no bolso deles",
    caption: "Aplicativo exclusivo para os alunos acessarem tudo onde e quando precisarem.",
    screenshot: "screens/checkin.png",
  },
  {
    start: 60.3,
    end: 66.9,
    layout: "grid",
    eyebrow: "Feito para artes marciais",
    title: "Moderno. Rápido. Seguro.",
    caption: "Uma plataforma desenvolvida especialmente para academias de artes marciais.",
    gridScreens: [
      "screens/dashboard.png",
      "screens/schedule.png",
      "screens/belts.png",
      "screens/checkin.png",
    ],
  },
  {
    start: 66.9,
    end: 70.5,
    layout: "brand",
    caption: "Tecnologia para quem vive as artes marciais.",
  },
  {
    start: 70.5,
    end: 73.8,
    layout: "outro",
    title: "Conheça agora",
    caption: "Transforme a gestão da sua academia.",
  },
];

const TOTAL_SECONDS = 73.8;
export const TOTAL_FRAMES_VERTICAL = s(TOTAL_SECONDS);

const PersistentHeader: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 60,
      left: 60,
      right: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      zIndex: 30,
    }}
  >
    <Img src={staticFile("images/logo.png")} style={{ height: 56, width: "auto" }} />
    <div
      style={{
        fontFamily: sans,
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: 5,
        color: colors.inkDim,
        textTransform: "uppercase",
      }}
    >
      <span style={{ color: colors.ruby }}>●</span> DOJO
    </div>
  </div>
);

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = interpolate(frame, [0, TOTAL_FRAMES_VERTICAL], [0, 100], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        bottom: 60,
        height: 4,
        background: "rgba(0,0,0,0.06)",
        borderRadius: 999,
        zIndex: 30,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: colors.ruby,
          borderRadius: 999,
        }}
      />
    </div>
  );
};

const BeatScene: React.FC<{ beat: Beat }> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = s(beat.end - beat.start);

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });
  const exit = interpolate(frame, [dur - 12, dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(enter, exit);
  const y = interpolate(enter, [0, 1], [30, 0]);

  if (beat.layout === "brand") {
    const scale = interpolate(enter, [0, 1], [0.9, 1]);
    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 100,
          opacity,
        }}
      >
        <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: sans,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 10,
              color: colors.ruby,
              textTransform: "uppercase",
              marginBottom: 36,
            }}
          >
            AMT Dojo Manager
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 110,
              fontWeight: 800,
              letterSpacing: -2,
              color: colors.ink,
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            {beat.caption}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (beat.layout === "intro") {
    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          padding: "0 90px",
          opacity,
        }}
      >
        <div style={{ transform: `translateY(${y}px)` }}>
          {beat.eyebrow && (
            <div
              style={{
                fontFamily: sans,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 8,
                color: colors.ruby,
                textTransform: "uppercase",
                marginBottom: 32,
              }}
            >
              {beat.eyebrow}
            </div>
          )}
          {beat.title && (
            <div
              style={{
                fontFamily: sans,
                fontSize: 128,
                fontWeight: 800,
                letterSpacing: -3,
                color: colors.ink,
                lineHeight: 1.02,
                marginBottom: 44,
              }}
            >
              {beat.title}
            </div>
          )}
          <div
            style={{
              fontFamily: sans,
              fontSize: 44,
              fontWeight: 400,
              color: colors.ink2,
              lineHeight: 1.35,
            }}
          >
            {beat.caption}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (beat.layout === "grid") {
    return (
      <AbsoluteFill style={{ padding: "200px 80px 180px", opacity }}>
        <div style={{ transform: `translateY(${y}px)`, marginBottom: 48 }}>
          <div
            style={{
              fontFamily: sans,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 8,
              color: colors.ruby,
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            {beat.eyebrow}
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 82,
              fontWeight: 800,
              letterSpacing: -2,
              color: colors.ink,
              lineHeight: 1.05,
              marginBottom: 22,
            }}
          >
            {beat.title}
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 32,
              color: colors.ink2,
              lineHeight: 1.4,
            }}
          >
            {beat.caption}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: 24,
            flex: 1,
          }}
        >
          {(beat.gridScreens ?? []).map((src, i) => {
            const delay = i * 4;
            const local = spring({
              frame: frame - delay,
              fps,
              config: { damping: 200 },
              durationInFrames: 20,
            });
            return (
              <div
                key={src}
                style={{
                  transform: `translateY(${interpolate(local, [0, 1], [20, 0])}px) scale(${interpolate(local, [0, 1], [0.98, 1])})`,
                  opacity: local,
                  borderRadius: 24,
                  overflow: "hidden",
                  border: `1px solid ${colors.border}`,
                  boxShadow: "0 30px 60px -30px rgba(0,0,0,0.25)",
                  background: colors.surface,
                }}
              >
                <Img
                  src={staticFile(src)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  if (beat.layout === "outro") {
    const scale = interpolate(enter, [0, 1], [0.94, 1]);
    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity,
          padding: 80,
        }}
      >
        <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
          <Img
            src={staticFile("images/logo.png")}
            style={{ height: 140, marginBottom: 48 }}
          />
          <div
            style={{
              fontFamily: sans,
              fontSize: 120,
              fontWeight: 800,
              letterSpacing: -3,
              color: colors.ink,
              lineHeight: 1.02,
              marginBottom: 28,
            }}
          >
            {beat.title}
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 38,
              color: colors.ink2,
              marginBottom: 44,
            }}
          >
            {beat.caption}
          </div>
          <div
            style={{
              display: "inline-block",
              padding: "24px 44px",
              borderRadius: 999,
              background: colors.ruby,
              color: "#fff",
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            dojomanager.amtfightwear.com.br
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // showcase — vertical stacking: text on top, big screenshot below
  const imgSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 28,
  });
  const imgY = interpolate(imgSpring, [0, 1], [60, 0]);
  const imgScale = interpolate(imgSpring, [0, 1], [0.94, 1]);
  const kenBurns = interpolate(frame, [0, dur], [1.02, 1.09]);
  const kenX = interpolate(frame, [0, dur], [0, -1.5]);

  return (
    <AbsoluteFill
      style={{
        opacity,
        padding: "180px 70px 140px",
        display: "flex",
        flexDirection: "column",
        gap: 56,
      }}
    >
      <div style={{ transform: `translateY(${y}px)` }}>
        <div
          style={{
            fontFamily: sans,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 8,
            color: colors.ruby,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          {beat.eyebrow}
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 74,
            fontWeight: 800,
            letterSpacing: -2,
            color: colors.ink,
            lineHeight: 1.05,
            marginBottom: 24,
          }}
        >
          {beat.title}
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 32,
            color: colors.ink2,
            lineHeight: 1.4,
          }}
        >
          {beat.caption}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          transform: `translateY(${imgY}px) scale(${imgScale})`,
          opacity: imgSpring,
          display: "flex",
        }}
      >
        <div
          style={{
            flex: 1,
            borderRadius: 28,
            overflow: "hidden",
            border: `1px solid ${colors.border}`,
            boxShadow:
              "0 60px 120px -40px rgba(0,0,0,0.45), 0 20px 40px -20px rgba(0,0,0,0.2)",
            background: colors.surface,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              height: 44,
              background: "#f5f5f7",
              borderBottom: `1px solid ${colors.border}`,
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: 7, background: "#ff5f57" }} />
            <span style={{ width: 14, height: 14, borderRadius: 7, background: "#febc2e" }} />
            <span style={{ width: 14, height: 14, borderRadius: 7, background: "#28c840" }} />
            <div
              style={{
                marginLeft: 20,
                fontFamily: sans,
                fontSize: 16,
                color: colors.inkDim,
                letterSpacing: 0.5,
              }}
            >
              dojomanager.amtfightwear.com.br
            </div>
          </div>
          {beat.screenshot && (
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                padding: 12,
              }}
            >
              <Img
                src={staticFile(beat.screenshot)}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  transform: `scale(${interpolate(kenBurns, [1.02, 1.09], [1, 1.03])})`,
                  transformOrigin: "center center",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const NarratedVideoVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Backdrop />
      <PersistentHeader />
      <ProgressBar />

      {beats.map((b) => {
        const from = s(b.start);
        const dur = s(b.end - b.start);
        return (
          <Sequence key={b.start} from={from} durationInFrames={dur}>
            <BeatScene beat={b} />
          </Sequence>
        );
      })}

      <Audio src={staticFile("audio/narration-vertical.mp3")} />
    </AbsoluteFill>
  );
};
