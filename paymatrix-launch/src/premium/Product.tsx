import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  ScanLine,
  WalletCards,
  Check,
  ChevronRight,
  Wifi,
  BatteryFull,
  Download,
  Users,
  Camera,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { C, DINNER, money } from "./data";

// Presentation adapters reference Dashboard.jsx, GroupHeader.jsx, ExpenseForm.jsx,
// BillScannerModal.jsx and SettleUpModal.jsx. Network/auth/actions are intentionally inert.
const card: React.CSSProperties = {
  background: "#151515",
  border: "1px solid #ffffff12",
  borderRadius: 22,
  padding: 22,
};
const label: React.CSSProperties = {
  fontSize: 12,
  color: "#ffffff75",
  lineHeight: 1.5,
};
const heading: React.CSSProperties = {
  fontFamily: "Manrope",
  letterSpacing: "-.04em",
  fontWeight: 750,
};
const Button: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({
  children,
  dark,
}) => (
  <div
    style={{
      borderRadius: 13,
      background: dark ? "#ffffff0b" : "#f4f4f4",
      color: dark ? "white" : "#191919",
      padding: "17px 12px",
      fontWeight: 650,
      fontSize: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      border: dark ? "1px solid #ffffff18" : undefined,
    }}
  >
    {children}
  </div>
);
const Avatar: React.FC<{ i: number }> = ({ i }) => (
  <div
    style={{
      width: 38,
      height: 38,
      borderRadius: 19,
      background: ["#284a42", "#514234", "#374957", "#4b3d51"][i],
      display: "grid",
      placeItems: "center",
      fontWeight: 600,
      color: "#ecf3ee",
    }}
  >
    {DINNER.people[i][0]}
  </div>
);
const Top: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      display: "flex",
      gap: 12,
      alignItems: "center",
      margin: "16px 0 24px",
    }}
  >
    <ArrowLeft size={20} />
    <span style={{ ...heading, fontSize: 24 }}>{title}</span>
  </div>
);

export const Product: React.FC<{
  view: "group" | "scan" | "split" | "balances" | "qr";
  progress?: number;
}> = ({ view, progress = 1 }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        width: 390,
        height: 844,
        background: C.dark,
        color: "#fff",
        fontFamily: "Inter",
        fontSize: 14,
        padding: "0 23px",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          height: 47,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span>9:41</span>
        <div style={{ display: "flex", gap: 7 }}>
          <Wifi size={14} />
          <BatteryFull size={19} />
        </div>
      </div>
      {view === "group" && (
        <>
          <div style={{ ...label, marginTop: 17 }}>Welcome back</div>
          <div style={{ ...heading, fontSize: 29, marginBottom: 24 }}>
            Aarav
          </div>
          <div
            style={{
              ...card,
              background: "linear-gradient(145deg,#101010,#242424)",
              padding: 26,
            }}
          >
            <div
              style={{
                ...label,
                textTransform: "uppercase",
                letterSpacing: 2,
                fontSize: 10,
              }}
            >
              Your position
            </div>
            <div style={{ ...label, marginTop: 8 }}>Overall, you are owed</div>
            <div
              style={{
                ...heading,
                fontSize: 47,
                margin: "25px 0",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {money(DINNER.receivable)}
            </div>
            <div
              style={{
                display: "flex",
                gap: 65,
                borderTop: "1px solid #ffffff15",
                paddingTop: 18,
              }}
            >
              <div>
                <span style={label}>You owe</span>
                <div style={{ fontSize: 20, marginTop: 5 }}>₹0</div>
              </div>
              <div>
                <span style={label}>You are owed</span>
                <div style={{ fontSize: 20, color: C.green, marginTop: 5 }}>
                  ₹3,210
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              margin: "18px 0 30px",
            }}
          >
            <Button>
              <Camera size={16} />
              Scan receipt
            </Button>
            <Button dark>
              <Plus size={16} />
              Add expense
            </Button>
          </div>
          <div style={{ ...heading, fontSize: 20, marginBottom: 13 }}>
            Active groups
          </div>
          <div
            style={{ ...card, display: "flex", alignItems: "center", gap: 13 }}
          >
            <Users color={C.green} size={29} />
            <div style={{ flex: 1 }}>
              <b>Dinner together</b>
              <div style={{ ...label, marginTop: 6 }}>4 members · Food</div>
            </div>
            <ChevronRight size={18} />
          </div>
          <div style={{ marginTop: 22, display: "flex", gap: 7 }}>
            {DINNER.people.map((_, i) => (
              <Avatar key={i} i={i} />
            ))}
          </div>
        </>
      )}
      {view === "scan" && (
        <>
          <Top title="Scan Bill" />
          <div
            style={{
              ...card,
              display: "flex",
              gap: 18,
              alignItems: "center",
              marginBottom: 22,
            }}
          >
            <ScanLine size={30} color={C.green} />
            <div>
              <div style={label}>Detected</div>
              <div style={{ ...heading, fontSize: 36 }}>
                {money(DINNER.total)}
              </div>
              <div style={label}>Dinner together</div>
            </div>
          </div>
          {[
            ["Total Amount", "4280"],
            ["Merchant / Title", "Dinner together"],
            ["Date", "08 Sep 2026"],
          ].map(([a, b]) => (
            <div
              key={a}
              style={{
                ...card,
                borderRadius: 15,
                padding: 19,
                marginBottom: 12,
              }}
            >
              <div style={label}>{a}</div>
              <div style={{ fontSize: 17, marginTop: 8, fontWeight: 500 }}>
                {b}
              </div>
            </div>
          ))}
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: "#ffffff80",
              margin: "25px 0",
            }}
          >
            Review the detected details before adding your expense.
          </div>
          <Button>
            Continue
            <ArrowRight size={16} />
          </Button>
          <div style={{ ...label, textAlign: "center", marginTop: 20 }}>
            Camera or gallery
          </div>
        </>
      )}
      {view === "split" && (
        <>
          <Top title="Add Expense" />
          <div style={label}>Dinner together · 4 participants</div>
          <div style={{ ...heading, fontSize: 48, margin: "18px 0 27px" }}>
            {money(DINNER.total)}
          </div>
          <div style={{ ...label, marginBottom: 9 }}>Split method</div>
          <div style={{ display: "flex", gap: 7, marginBottom: 24 }}>
            {["Equal", "Percent", "Exact", "Shares"].map((s, i) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "12px 0",
                  fontSize: 12,
                  borderRadius: 10,
                  background: i === 0 ? "#fff" : "#ffffff08",
                  color: i === 0 ? "#111" : "#aaa",
                }}
              >
                {s}
              </div>
            ))}
          </div>
          <div style={{ ...label, marginBottom: 16 }}>
            Paid by Aarav · Split equally
          </div>
          {DINNER.people.map((name, i) => {
            const p = interpolate(
              progress,
              [i * 0.12, 0.5 + i * 0.12],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "18px 0",
                  borderBottom: "1px solid #ffffff10",
                }}
              >
                <Avatar i={i} />
                <div style={{ flex: 1 }}>
                  <b>
                    {name}
                    {i === 0 ? " (you)" : ""}
                  </b>
                  <div style={{ ...label, fontSize: 11, marginTop: 4 }}>
                    25% equal share
                  </div>
                </div>
                <span
                  style={{
                    ...heading,
                    fontSize: 23,
                    opacity: p,
                    transform: `translateY(${(1 - p) * 9}px)`,
                  }}
                >
                  {money(DINNER.share)}
                </span>
              </div>
            );
          })}
          <div style={{ marginTop: 27 }}>
            <Button>
              <Check size={17} />
              Save expense
            </Button>
          </div>
        </>
      )}
      {(view === "balances" || view === "qr") && (
        <>
          <Top title="Settle Up" />
          <div style={{ ...card, marginBottom: 22 }}>
            <div style={label}>You are owed in this group</div>
            <div
              style={{
                ...heading,
                fontSize: 39,
                color: C.green,
                marginTop: 10,
              }}
            >
              {money(DINNER.receivable)}
            </div>
          </div>
          <div style={{ ...label, marginBottom: 10 }}>Dinner together</div>
          {DINNER.people.slice(1).map((name, i) => (
            <div key={name} style={{ ...card, margin: "12px 0", padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar i={i + 1} />
                <div style={{ flex: 1 }}>
                  <b>{name}</b>
                  <div style={{ ...label, fontSize: 11, marginTop: 5 }}>
                    owes Aarav
                  </div>
                </div>
                <span style={{ ...heading, fontSize: 25, color: "#fcd34d" }}>
                  {money(DINNER.share)}
                </span>
              </div>
              {i === 0 && (
                <div style={{ marginTop: 17 }}>
                  <Button dark>
                    <WalletCards size={15} />
                    Pay via UPI
                  </Button>
                </div>
              )}
            </div>
          ))}
          <p style={{ ...label, fontSize: 11, marginTop: 20 }}>
            Record a settlement only after checking your bank or UPI app.
          </p>
        </>
      )}
      {view === "qr" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#000a",
            display: "flex",
            alignItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #ffffff25",
              borderRadius: 28,
              padding: 25,
              width: "100%",
              boxShadow: "0 30px 70px #0008",
              transform: `translateY(${interpolate(f, [0, 30], [25, 0], { extrapolateRight: "clamp" })}px)`,
            }}
          >
            <div style={{ ...heading, fontSize: 27, textAlign: "center" }}>
              Scan to Pay
            </div>
            <div
              style={{
                textAlign: "center",
                margin: "10px 0 22px",
                color: "#bbb",
              }}
            >
              Pay Aarav <b style={{ color: C.green }}>₹1,070</b>
            </div>
            <div
              style={{
                background: "white",
                padding: 18,
                borderRadius: 17,
                width: 236,
                margin: "auto",
              }}
            >
              <QRCodeSVG
                value="paymatrix-ad-demo:not-a-payment"
                size={200}
                marginSize={2}
              />
            </div>
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.65,
                color: "#bbb",
                textAlign: "center",
                margin: "20px 0",
              }}
            >
              Open your UPI app and scan the code.
              <br />
              Or save it and scan from your gallery.
            </p>
            <Button dark>
              <Download size={15} />
              Save QR
            </Button>
            <div
              style={{
                ...label,
                fontSize: 10,
                textAlign: "center",
                marginTop: 16,
              }}
            >
              Illustrative QR · no payment destination
            </div>
          </div>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          width: 110,
          height: 4,
          borderRadius: 10,
          background: "#ffffff75",
          left: 140,
        }}
      />
    </div>
  );
};
