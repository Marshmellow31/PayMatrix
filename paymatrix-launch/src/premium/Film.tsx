import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { ArrowUpRight, Check, ScanLine } from "lucide-react";
import { BEATS, C, DINNER, money } from "./data";
import { Product } from "./Product";

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const tween = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
const reveal = (f: number, delay = 0): React.CSSProperties => ({
  opacity: tween(f, delay, delay + 28),
  transform: `translateY(${tween(f, delay, delay + 40, 35, 0)}px)`,
});

const Brand: React.FC<{ dark?: boolean; size?: number }> = ({
  dark = false,
  size = 35,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 15,
      color: dark ? C.ink : C.white,
    }}
  >
    <Img
      src={staticFile("logo.png")}
      style={{ width: size * 1.3, height: size * 1.3, borderRadius: 12 }}
    />
    <span
      style={{
        fontFamily: "Manrope",
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-.04em",
      }}
    >
      paymatrix
    </span>
  </div>
);

const Stage: React.FC<{
  light?: boolean;
  children: React.ReactNode;
  duration: number;
  hold?: boolean;
}> = ({ light = false, children, duration, hold = false }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: light ? C.paper : C.ink,
        color: light ? C.ink : C.white,
        overflow: "hidden",
        fontFamily: "Manrope",
      }}
    >
      <AbsoluteFill
        style={{
          background: light
            ? "radial-gradient(ellipse at 80% 30%,#f4f6ef 0%,transparent 60%),linear-gradient(140deg,#d6e6db,#e8e9dd)"
            : "radial-gradient(ellipse at 95% 30%,#285b46 0%,transparent 59%),radial-gradient(ellipse at 0% 90%,#4b4233 0%,transparent 48%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1500,
          height: 1500,
          border: `1px solid ${light ? "#254b3020" : "#d5f9e019"}`,
          borderRadius: "50%",
          top: 700,
          left: 260,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1300,
          height: 1300,
          border: `1px solid ${light ? "#254b3010" : "#d5f9e00c"}`,
          borderRadius: "50%",
          top: 800,
          left: 360,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: hold
            ? 1
            : interpolate(f, [duration - 12, duration], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Head: React.FC<{
  eyebrow: string;
  children: React.ReactNode;
  light?: boolean;
  sub?: string;
}> = ({ eyebrow, children, light = false, sub }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 140,
        right: 75,
        ...reveal(f),
      }}
    >
      <h1
        style={{
          fontSize: 104,
          lineHeight: 1.05,
          fontWeight: 650,
          letterSpacing: "-.04em",
          margin: 0,
        }}
      >
        {children}
      </h1>
      {sub && (
        <div
          style={{
            fontSize: 30,
            lineHeight: 1.5,
            color: light ? "#506458" : C.muted,
            marginTop: 28,
            fontFamily: "Inter",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};

const Phone: React.FC<{
  view: React.ComponentProps<typeof Product>["view"];
  width?: number;
  rotate?: number;
  progress?: number;
}> = ({ view, width = 760, rotate = 0, progress = 1 }) => {
  const scale = width / 406;
  return (
    <div
      style={{
        width,
        height: 876 * scale,
        position: "relative",
        transform: `perspective(2400px) rotateY(${rotate}deg) rotateZ(${-rotate * 0.13}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        style={{
          width: 406,
          height: 876,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          borderRadius: 48,
          padding: 8,
          boxSizing: "border-box",
          background:
            "linear-gradient(115deg,#d2dbd3 0%,#68756e 4%,#18221d 9%,#607268 93%,#c0cbc3 98%)",
          boxShadow: "0 45px 80px #07130f65, inset 0 0 0 1px #f1f9f080",
          position: "relative",
        }}
      >
        <div
          style={{
            borderRadius: 40,
            overflow: "hidden",
            border: "1px solid #020a06",
            height: 858,
            background: C.dark,
          }}
        >
          <Product view={view} progress={progress} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 185,
            top: 18,
            width: 33,
            height: 10,
            borderRadius: 10,
            background: "#080c0a",
            boxShadow: "inset 0 1px 2px #ffffff16",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -3,
            top: 170,
            width: 3,
            height: 70,
            background: "#8c9a91",
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
};

const Receipt: React.FC<{ small?: boolean }> = ({ small = false }) => (
  <div
    style={{
      width: small ? 500 : 670,
      background: "#f1f0e5",
      color: "#27352b",
      padding: small ? 38 : 56,
      boxSizing: "border-box",
      boxShadow: "0 35px 65px #06120c50",
      fontFamily: "Inter",
      position: "relative",
    }}
  >
    <div
      style={{
        fontFamily: "Manrope",
        fontSize: small ? 30 : 38,
        letterSpacing: "-.04em",
        fontWeight: 650,
      }}
    >
      A table for four.
    </div>
    <div
      style={{
        fontSize: 17,
        color: "#647063",
        marginTop: 14,
        paddingBottom: 30,
        borderBottom: "1px dashed #52644860",
      }}
    >
      DINNER TOGETHER / 08 SEP 2026
    </div>
    {DINNER.items.map((x) => (
      <div
        key={x.name}
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: small ? 20 : 26,
          marginTop: 30,
        }}
      >
        <span>{x.name}</span>
        <span>{money(x.amount)}</span>
      </div>
    ))}
    <div
      style={{
        borderTop: "1px solid #6a776950",
        marginTop: 42,
        paddingTop: 30,
      }}
    >
      <div style={{ fontSize: 18, letterSpacing: 2 }}>TOTAL</div>
      <div
        style={{
          fontFamily: "Manrope",
          fontSize: small ? 66 : 90,
          fontWeight: 650,
          letterSpacing: "-.04em",
          marginTop: 12,
        }}
      >
        {money(DINNER.total)}
      </div>
    </div>
    <div style={{ marginTop: 30, fontSize: 17, color: "#687064" }}>
      Good food. Better company.
    </div>
    <div
      style={{
        position: "absolute",
        bottom: -10,
        left: 0,
        right: 0,
        height: 12,
        background:
          "linear-gradient(135deg, #f1f0e5 25%, transparent 25%) -10px 0, linear-gradient(225deg, #f1f0e5 25%, transparent 25%) -10px 0",
        backgroundSize: "20px 20px",
      }}
    />
  </div>
);

const Beat: React.FC<{ index: number }> = ({ index }) => {
  const f = useCurrentFrame();
  const duration = BEATS[index].duration;
  if (index === 0)
    return (
      <Stage duration={duration}>
        <Head eyebrow="For the moments you share">
          Great dinner.
          <br />
          <span style={{ color: C.green }}>Who owes what?</span>
        </Head>
        <div
          style={{
            position: "absolute",
            top: 720,
            left: 205,
            transform: `translateY(${tween(f, 0, 50, 80, 0)}px) rotate(-6deg)`,
            opacity: tween(f, 0, 25),
          }}
        >
          <Receipt />
        </div>
        <div
          style={{
            position: "absolute",
            top: 1570,
            left: 100,
            right: 100,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {DINNER.people.map((name, i) => (
            <div
              key={name}
              style={{
                ...reveal(f, 25 + i * 10),
                fontSize: 27,
                color: C.muted,
                borderTop: "1px solid #addec53a",
                paddingTop: 25,
                width: 170,
              }}
            >
              <span style={{ fontSize: 18, color: C.green }}>0{i + 1}</span>
              <div style={{ marginTop: 10 }}>{name}</div>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 145, left: 80 }}>
          <Brand />
        </div>
      </Stage>
    );
  if (index === 1)
    return (
      <Stage duration={duration}>
        <Head eyebrow="Meet paymatrix">
          Shared expenses.
          <br />
          Simplified.
        </Head>
        <div
          style={{
            position: "absolute",
            top: 590,
            left: 155,
            transform: `translateY(${tween(f, 0, 65, 170, 0)}px)`,
            opacity: tween(f, 0, 25),
          }}
        >
          <Phone view="group" width={770} rotate={tween(f, 0, 85, -17, 0)} />
        </div>
      </Stage>
    );
  if (index === 2) {
    const p = tween(f, 55, 100);
    return (
      <Stage light duration={duration}>
        <Head
          light
          eyebrow="01 / Capture"
          sub="Your bill becomes an editable expense."
        >
          Scan. Review.
          <br />
          Continue.
        </Head>
        <div
          style={{
            position: "absolute",
            top: 730,
            left: 205,
            opacity: 1 - p,
            transform: `translateY(${p * -50}px) scale(${1 - p * 0.05})`,
          }}
        >
          <Receipt />
          <div
            style={{
              position: "absolute",
              top: tween(f, 8, 58, 10, 520),
              left: -20,
              right: -20,
              height: 2,
              background: "#2d8865",
              boxShadow: "0 0 22px #31966c80",
              opacity: f < 60 ? 1 : 0,
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 665,
            left: 155,
            opacity: p,
            transform: `translateY(${(1 - p) * 60}px)`,
          }}
        >
          <Phone view="scan" width={770} />
        </div>
      </Stage>
    );
  }
  if (index === 3)
    return (
      <Stage duration={duration}>
        <Head eyebrow="02 / Split" sub="₹4,280 · 4 people · ₹1,070 each">
          Everyone’s share.
          <br />
          <span style={{ color: C.green }}>Clear.</span>
        </Head>
        <div
          style={{ position: "absolute", top: 650, left: 155, ...reveal(f, 8) }}
        >
          <Phone view="split" width={770} progress={tween(f, 40, 125)} />
        </div>
      </Stage>
    );
  if (index === 4)
    return (
      <Stage duration={duration}>
        <Head eyebrow="03 / Settle up" sub="One shared view of what’s owed.">
          Know who
          <br />
          owes whom.
        </Head>
        <div
          style={{ position: "absolute", top: 650, left: 155, ...reveal(f, 8) }}
        >
          <Phone view="balances" width={770} />
        </div>
      </Stage>
    );
  if (index === 5)
    return (
      <Stage duration={duration}>
        <Head
          eyebrow="04 / Pay via UPI"
          sub="Scan or save the QR in your UPI app."
        >
          Your share.
          <br />
          <span style={{ color: C.green }}>Ready to pay.</span>
        </Head>
        <div
          style={{ position: "absolute", top: 650, left: 155, ...reveal(f, 8) }}
        >
          <Phone view="qr" width={770} />
        </div>
      </Stage>
    );
  if (index === 6)
    return (
      <Stage light duration={duration}>
        <Head light eyebrow="Back to the good part">
          Less maths.
          <br />
          More moments.
        </Head>
        <div
          style={{
            position: "absolute",
            top: 680,
            left: 95,
            transform: "rotate(-8deg)",
            ...{ opacity: tween(f, 0, 25) },
          }}
        >
          <Receipt small />
        </div>
        <div
          style={{
            position: "absolute",
            top: 960,
            left: 420,
            transform: `rotate(6deg) translateY(${tween(f, 0, 50, 50, 0)}px)`,
          }}
        >
          <Phone view="split" width={540} />
        </div>
      </Stage>
    );
  return (
    <Stage duration={duration} hold>
      <div style={{ position: "absolute", left: 80, top: 260, ...reveal(f) }}>
        <Brand size={62} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 70,
          top: 650,
          ...reveal(f, 8),
        }}
      >
        <h1
          style={{
            fontSize: 126,
            fontWeight: 600,
            lineHeight: 1.08,
            letterSpacing: "-.04em",
            margin: 0,
          }}
        >
          Make your
          <br />
          next split
          <br />
          <span style={{ color: C.green }}>simple.</span>
        </h1>
        <div
          style={{
            marginTop: 80,
            fontSize: 34,
            fontFamily: "Inter",
            display: "flex",
            alignItems: "center",
            gap: 25,
            borderBottom: "1px solid #abc6b750",
            paddingBottom: 26,
            width: "fit-content",
          }}
        >
          pay-matrix.vercel.app
          <ArrowUpRight size={37} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 230,
          left: 80,
          right: 80,
          borderTop: "1px solid #b0dbbf30",
          paddingTop: 35,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          color: C.muted,
        }}
      >
        <span>Shared expenses. Simplified.</span>
        <span>paymatrix</span>
      </div>
    </Stage>
  );
};

export const PremiumFilm: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <style>{`@font-face{font-family:Manrope;src:url('${staticFile("fonts/Manrope.ttf")}') format('truetype');font-weight:200 800;}@font-face{font-family:Inter;src:url('${staticFile("fonts/Inter.ttf")}') format('truetype');font-weight:100 900;}*{box-sizing:border-box}`}</style>
    <Audio src={staticFile("audio/shared-moments.wav")} volume={1.8} />
    {BEATS.map((b, i) => (
      <Sequence key={b.name} from={b.start} durationInFrames={b.duration}>
        <Beat index={i} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
