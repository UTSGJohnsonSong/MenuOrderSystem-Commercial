"use client";

import { useState } from "react";
import { useMealLog } from "@/lib/store";
import { MealLog } from "@/lib/types";
import { mealInfo, mealOrder } from "@/lib/meals";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return { month, day, week, full: `${d.getFullYear()}年${month}月${day}日` };
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0];
}

function FoodChip({ name, imageUrl, quantity }: { name: string; imageUrl: string; quantity: number }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      flexShrink: 0, width: "76px", gap: "5px",
    }}>
      {imageUrl && !imgErr ? (
        <img src={imageUrl} alt={name} loading="lazy" onError={() => setImgErr(true)} style={{
          width: "64px", height: "64px", borderRadius: "16px",
          objectFit: "cover", display: "block",
        }} />
      ) : (
        <div style={{
          width: "64px", height: "64px", borderRadius: "16px",
          background: "linear-gradient(135deg, #FFE8CC, #FFF3E0)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "0.5625rem", color: "#C48A4A", textAlign: "center", padding: "4px" }}>
            {name}
          </span>
        </div>
      )}
      <p style={{
        color: "#3A2A1A", fontSize: "0.6875rem", fontWeight: 500,
        textAlign: "center", lineHeight: 1.3,
        width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{name}</p>
      {quantity > 1 && (
        <span style={{
          backgroundColor: "#FFF1DD", color: "#F2A24A",
          fontSize: "0.5625rem", fontWeight: 700,
          padding: "1px 6px", borderRadius: "999px",
          marginTop: "-2px",
        }}>×{quantity}</span>
      )}
    </div>
  );
}

function LogCard({ log, onDelete }: { log: MealLog; onDelete: () => void }) {
  const { month, day, week, full } = formatDate(log.date);
  const today = isToday(log.date);
  const grouped = new Map<string, typeof log.items[0][]>();
  log.items.forEach(item => {
    const key = item.category_name;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  });

  return (
    <div style={{
      backgroundColor: "#FFFFFF", borderRadius: "20px", padding: "16px",
      boxShadow: "0 2px 12px rgba(58,42,26,0.07)", marginBottom: "12px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "14px",
            backgroundColor: today ? "#F2A24A" : "#FFF1DD",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: today ? "#FFFFFF" : "#F2A24A", fontSize: "1rem", fontWeight: 800, lineHeight: 1 }}>
              {day}
            </span>
            <span style={{ color: today ? "rgba(255,255,255,0.8)" : "#C8A878", fontSize: "0.5625rem", lineHeight: 1 }}>
              周{week}
            </span>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <p style={{ color: "#3A2A1A", fontSize: "0.875rem", fontWeight: 600 }}>
                {today ? "今天" : full}
              </p>
              {log.meal !== "all" && (
                <span style={{
                  backgroundColor: "#FFF1DD", color: "#C47A2C",
                  fontSize: "0.6875rem", fontWeight: 700,
                  padding: "2px 9px", borderRadius: "999px", flexShrink: 0,
                }}>
                  {mealInfo(log.meal).emoji} {mealInfo(log.meal).label}
                </span>
              )}
            </div>
            <p style={{ color: "#9A7B5F", fontSize: "0.75rem" }}>
              共 {log.items.reduce((s, i) => s + i.quantity, 0)} 道菜
            </p>
          </div>
        </div>
        <button onClick={onDelete} style={{
          color: "#C8A878", fontSize: "0.75rem", padding: "4px 8px",
        }}>删除</button>
      </div>

      {/* Category chips */}
      {Array.from(grouped.entries()).map(([catName, items]) => (
        <div key={catName} style={{ marginBottom: "10px" }}>
          <p style={{ color: "#9A7B5F", fontSize: "0.6875rem", fontWeight: 500, marginBottom: "6px" }}>
            {catName}
          </p>
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
            {items.map((item, i) => (
              <FoodChip key={i} name={item.name} imageUrl={item.image_url} quantity={item.quantity} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  const now = new Date();
  const isThisYear = parseInt(year) === now.getFullYear();
  return isThisYear ? `${parseInt(month)}月` : `${year}年${parseInt(month)}月`;
}

export default function ShijiPage() {
  const { logs, deleteLog } = useMealLog();

  const today = new Date().toISOString().split("T")[0];
  const hasToday = logs.some(l => l.date === today);

  // 未来的备餐计划置顶（按日期升序，同日按早→午→晚）；过去和今天按月倒序
  const upcoming = logs
    .filter(l => l.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || mealOrder(a.meal) - mealOrder(b.meal));
  const sorted = logs
    .filter(l => l.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date) || mealOrder(a.meal) - mealOrder(b.meal));

  // Group by month
  const grouped: { key: string; logs: typeof sorted }[] = [];
  for (const log of sorted) {
    const key = monthKey(log.date);
    const last = grouped[grouped.length - 1];
    if (last && last.key === key) {
      last.logs.push(log);
    } else {
      grouped.push({ key, logs: [log] });
    }
  }

  const navH = "calc(56px + env(safe-area-inset-bottom))";

  return (
    <div style={{
      height: `calc(100dvh - ${navH})`,
      overflowY: "auto",
      overscrollBehavior: "contain",
      backgroundColor: "#FFF8EF",
    }}>
      {/* Header */}
      <div style={{ padding: "24px 20px 16px" }}>
        <p style={{ color: "#9A7B5F", fontSize: "0.8125rem", marginBottom: "4px" }}>
          日子不紧不慢
        </p>
        <h1 style={{ color: "#3A2A1A", fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.3 }}>
          每天好好吃饭
        </h1>
      </div>

      <div style={{ padding: "0 16px 120px" }}>
        {sorted.length === 0 && upcoming.length === 0 ? (
          <div style={{
            paddingTop: "60px", textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
          }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "24px",
              backgroundColor: "#FFF1DD",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2.5rem", marginBottom: "8px",
            }}>🍱</div>
            <p style={{ color: "#9A7B5F", fontSize: "0.9375rem" }}>还没有食记</p>
            <p style={{ color: "#C8A878", fontSize: "0.8125rem" }}>
              去点菜页选好后，点「发送主厨」保存
            </p>
          </div>
        ) : (
          <>
            {/* 备餐计划：还没到的日子 */}
            {upcoming.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{
                  color: "#C47A2C", fontSize: "0.75rem", fontWeight: 700,
                  letterSpacing: "0.04em", padding: "4px 4px 8px",
                }}>
                  🗓 接下来的安排
                </p>
                {upcoming.map(log => (
                  <LogCard key={log.id} log={log} onDelete={() => deleteLog(log.id)} />
                ))}
              </div>
            )}
            {!hasToday && (
              <div style={{
                backgroundColor: "#FFF1DD", borderRadius: "16px",
                padding: "14px 16px", marginBottom: "12px",
                display: "flex", alignItems: "center", gap: "10px",
              }}>
                <span style={{ fontSize: "1.25rem" }}>🌤️</span>
                <div>
                  <p style={{ color: "#3A2A1A", fontSize: "0.875rem", fontWeight: 600 }}>今天还没记录</p>
                  <p style={{ color: "#9A7B5F", fontSize: "0.75rem" }}>去点菜页选好后发送主厨即可保存</p>
                </div>
              </div>
            )}
            {grouped.map(({ key, logs: monthLogs }) => (
              <div key={key}>
                <p style={{
                  color: "#C8A878", fontSize: "0.6875rem", fontWeight: 700,
                  letterSpacing: "0.06em", padding: "8px 4px 6px",
                }}>{monthLabel(key)}</p>
                {monthLogs.map(log => (
                  <LogCard key={log.id} log={log} onDelete={() => deleteLog(log.id)} />
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
