import { sql } from "./db";

/*
 * 服务端埋点。
 *
 * 为什么在服务端打而不是客户端：这几个动作本来就要经过服务器（加菜、存食记、
 * 传图、接受邀请），在这里打不会被网络抖动、广告拦截、或者用户点完就关页面漏掉。
 * 客户端只保留那些服务器看不见的动作（落地页曝光），走 /api/events 的白名单。
 *
 * 为什么是 fire-and-forget：埋点失败绝不能让业务动作失败。用户加一道菜的时候，
 * 统计写不进去是我的问题，不是他的。
 *
 * 为什么要 console.error 而不是静默吞掉：表改名、列变更、连接池打满，
 * 这些都会让某个指标永远读到 0，而看板上的 0 和「真的没人做过这件事」长得一模一样。
 * 有一行日志，排查是五分钟；没有，是几天。
 *
 * ⚠️ meta 只放**枚举值**（"library" / "manual" 这种），绝不放菜名、手机号、
 * 用户输入的任何内容。events 表没有 space_id 也没有 user_id，是有意的——
 * 它只回答「这个动作发生了多少次」，不回答「谁做的」。
 */
export function track(name: string, meta = ""): void {
  const clean = meta.slice(0, 32).replace(/[^\w-]/g, "");
  sql`INSERT INTO events (name, meta) VALUES (${name}, ${clean})`
    .catch(e => console.error(`[track] ${name} failed`, e));
}
