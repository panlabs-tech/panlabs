import { ImageResponse } from "next/og";

export const alt = "panlabs — laboratório vivo de soluções de software criadas com AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "0 90px",
        background: "#07080a",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 32,
          fontFamily: "monospace",
          color: "#7a808a",
          marginBottom: 22,
        }}
      >
        panini@panlabs:~$ ls ./panlabs
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 150,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-4px",
          backgroundImage: "linear-gradient(120deg,#c44fd0,#8b5cf6,#3d9be0)",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        panlabs
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 38,
          color: "#aab0ba",
          marginTop: 30,
          maxWidth: 940,
        }}
      >
        Laboratório vivo de soluções de software criadas com AI.
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 27,
          fontFamily: "monospace",
          color: "#6a7079",
          marginTop: 40,
        }}
      >
        build
        <span style={{ color: "#3d9be0", margin: "0 12px" }}>*</span>
        automate
        <span style={{ color: "#9b6cf0", margin: "0 12px" }}>*</span>
        innovate
      </div>
    </div>,
    size,
  );
}
