import React from "react";
import { Composition } from "remotion";
import { SelkirkShort, SELKIRK_FRAMES } from "./videos/selkirk/Selkirk";
import { SiffreShort, SIFFRE_FRAMES } from "./videos/siffre/Siffre";
import { HermitShort, HERMIT_FRAMES } from "./videos/hermit/Hermit";
import { DashShort, DASH_FRAMES } from "./videos/dash/Dash";
import { AdShort, AD_FRAMES } from "./videos/ad/Ad";

export const Root: React.FC = () => (
  <>
    <Composition id="SelkirkShort" component={SelkirkShort} durationInFrames={SELKIRK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SiffreShort" component={SiffreShort} durationInFrames={SIFFRE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="HermitShort" component={HermitShort} durationInFrames={HERMIT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="DashShort" component={DashShort} durationInFrames={DASH_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="AdShort" component={AdShort} durationInFrames={AD_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
