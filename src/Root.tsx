import React from "react";
import { Composition } from "remotion";
import { SelkirkShort, SELKIRK_FRAMES } from "./videos/selkirk/Selkirk";

export const Root: React.FC = () => (
  <>
    <Composition id="SelkirkShort" component={SelkirkShort} durationInFrames={SELKIRK_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
