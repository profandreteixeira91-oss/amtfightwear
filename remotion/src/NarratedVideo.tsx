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

// Beat = one narration segment tied to visuals.
type Beat = {
  start: number; // seconds
  end: number;
  eyebrow?: string;
  title?: string;
  caption: string;
  screenshot?: string; // relative to public/
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
    caption:
      "Alunos, financeiro, graduações e operação — em perfeita sintonia.",
  },
  {
    start: 12.6,
    end: 18.2,
    layout: "brand",
    caption:
      "Uma plataforma completa para a gestão da sua academia.",
  },
  {
    start: 18.2,
    end: 22.5,
    layout: "showcase",
    eyebrow: "01 · Dashboard",
    title: "Visão completa em tempo real",
    caption:
      "Dashboard moderno e intuitivo com a saúde do seu dojo em um relance.",
    screenshot: "screens/dashboard.png",
  },
  {
    start: 22.5,
    end: 30.8,
    layout: "showcase",
    eyebrow: "02 · Alunos",
    title: "Ficha 360° do atleta",
    caption:
      "Cadastro, documentos, avaliações e evolução — todo o histórico num só lugar.",
    screenshot: "screens/students.png",
  },
  {
    start: 30.8,
    end: 38.5,
    layout: "showcase",
    eyebrow: "03 · Financeiro",
    title: "Motor financeiro seguro",
    caption:
      "Mensalidades, recebimentos, despesas e indicadores em tempo real.",
    screenshot: "screens/finance.png",
  },
  {
    start: 38.5,
    end: 45.0,
    layout: "showcase",
    eyebrow: "04 · Graduações & Certificados",
    title: "Do branco ao preto",
    caption:
      "Organize graduações, registre históricos e emita certificados em poucos cliques.",
    screenshot: "screens/graduations.png",
  },
  {
    start: 45.0,
    end: 51.0,
    layout: "showcase",
    eyebrow: "05 · Check-in & Ranking",
    title: "Presença que vira desempenho",
    caption:
      "Frequência, check-ins geolocalizados e rankings inteligentes por turma.",
    screenshot: "screens/ranking.png",
  },
  {
    start: 51.0,
    end: 60.3,
    layout: "showcase",
    eyebrow: "06 · PWA do Aluno",
    title: "Sua academia no bolso deles",
    caption:
      "Aplicativo exclusivo para os alunos acessarem tudo onde e quando precisarem.",
    screenshot: "screens/checkin.png",
  },
  {
    start: 60.3,
    end: 66.9,
    layout: "grid",
    eyebrow: "Feito para artes marciais",
    title: "Moderno. Rápido. Seguro.",
    caption:
      "Uma plataforma desenvolvida especialmente para academias de artes marciais.",
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
export const TOTAL_FRAMES = s(TOTAL_SECONDS);

const PersistentHeader: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 44,
      left: 60,
      right: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      zIndex: 30,
    }}
  >
    <Img src={staticFile("images/logo.png")} style={{ height: 44, width: "auto" }} />
    <div
      style={{
        fontFamily: sans,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 6,
        color: colors.inkDim,
        textTransform: "uppercase",
      }}
    >
      <span style={{ color: colors.ruby }}>●</span> Gestão · Disciplina · Evolução
    </div>
  </div>
);

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = interpolate(frame, [0, TOTAL_FRAMES], [0, 100], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        bottom: 44,
        height: 3,
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
  const y = interpolate(enter, [0, 1], [24, 0]);

  if (beat.layout === "brand") {
    const scale = interpolate(enter, [0, 1], [0.9, 1]);
    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          opacity,
        }}
      >
        <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 8,
              color: colors.ruby,
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            AMT Dojo Manager
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 88,
              fontWeight: 800,
              letterSpacing: -2,
              color: colors.ink,
              lineHeight: 1.05,
              maxWidth: 1500,
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
          padding: "0 140px",
          opacity,
        }}
      >
        <div style={{ transform: `translateY(${y}px)`, maxWidth: 1400 }}>
          {beat.eyebrow && (
            <div
              style={{
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 6,
                color: colors.ruby,
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              {beat.eyebrow}
            </div>
          )}
          {beat.title && (
            <div
              style={{
                fontFamily: sans,
                fontSize: 96,
                fontWeight: 800,
                letterSpacing: -2,
                color: colors.ink,
                lineHeight: 1.02,
                marginBottom: 28,
              }}
            >
              {beat.title}
            </div>
          )}
          <div
            style={{
              fontFamily: sans,
              fontSize: 30,
              fontWeight: 400,
              color: colors.ink2,
              lineHeight: 1.4,
              maxWidth: 1100,
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
      <AbsoluteFill style={{ padding: "140px 100px 120px", opacity }}>
        <div style={{ transform: `translateY(${y}px)`, marginBottom: 32, maxWidth: 900 }}>
          <div
            style={{
              fontFamily: sans,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 6,
              color: colors.ruby,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            {beat.eyebrow}
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 58,
              fontWeight: 800,
              letterSpacing: -1.5,
              color: colors.ink,
              lineHeight: 1.05,
              marginBottom: 16,
            }}
          >
            {beat.title}
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 22,
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
            gap: 20,
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
                  borderRadius: 20,
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
        }}
      >
        <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
          <Img
            src={staticFile("images/logo.png")}
            style={{ height: 96, marginBottom: 32 }}
          />
          <div
            style={{
              fontFamily: sans,
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: -2,
              color: colors.ink,
              lineHeight: 1.02,
              marginBottom: 20,
            }}
          >
            {beat.title}
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 26,
              color: colors.ink2,
              marginBottom: 28,
            }}
          >
            {beat.caption}
          </div>
          <div
            style={{
              display: "inline-block",
              padding: "16px 32px",
              borderRadius: 999,
              background: colors.ruby,
              color: "#fff",
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            dojomanager.amtfightwear.com.br
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // showcase — screenshot on right, text on left
  const imgSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });
  const imgY = interpolate(imgSpring, [0, 1], [40, 0]);
  const imgScale = interpolate(imgSpring, [0, 1], [0.96, 1]);
  const kenBurns = interpolate(frame, [0, dur], [1.0, 1.04]);

  return (
    <AbsoluteFill
      style={{
        opacity,
        padding: "140px 80px 120px",
        display: "flex",
        alignItems: "center",
        gap: 60,
      }}
    >
      <div
        style={{
          flex: "0 0 42%",
          transform: `translateY(${y}px)`,
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 6,
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
            fontSize: 62,
            fontWeight: 800,
            letterSpacing: -1.5,
            color: colors.ink,
            lineHeight: 1.04,
            marginBottom: 24,
          }}
        >
          {beat.title}
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 24,
            color: colors.ink2,
            lineHeight: 1.45,
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
        }}
      >
        <div
          style={{
            borderRadius: 24,
            overflow: "hidden",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 40px 80px -30px rgba(0,0,0,0.28)",
            background: colors.surface,
          }}
        >
          {beat.screenshot && (
            <Img
              src={staticFile(beat.screenshot)}
              style={{
                width: "100%",
                display: "block",
                transform: `scale(${kenBurns})`,
                transformOrigin: "center",
              }}
            />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const NarratedVideo: React.FC = () => {
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

      <Audio src={staticFile("audio/narration.mp3")} />
    </AbsoluteFill>
  );
};
