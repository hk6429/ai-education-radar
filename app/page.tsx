import type { Metadata } from "next";
import { NewsDashboard } from "./components/news-dashboard";
import { getDemoItems } from "../lib/news";

export const metadata: Metadata = {
  title: "AI 教育雷達｜把最新 AI 消息說人話",
  description:
    "整理 X 與可信新聞來源的最新 AI 消息，用孩子聽得懂的話，提供國中老師與資訊組可立即採用的方向。",
};

export default function Home() {
  return <NewsDashboard initialItems={getDemoItems()} />;
}
