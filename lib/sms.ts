import { createHmac, randomUUID } from "crypto";

/*
 * 短信验证码发送，通过 SMS_PROVIDER 环境变量切换：
 *   - "console"（默认）：不真发短信，打印到服务器日志，开发用。
 *                        生产环境下拒绝发送，防止误上线。
 *   - "aliyun"：阿里云短信服务（需要在阿里云申请签名和模板，
 *               模板内容形如「您的验证码是${code}，5分钟内有效」）。
 * 以后要换腾讯云短信，只需在这里加一个 provider 实现。
 */

export async function sendSmsCode(phone: string, code: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER ?? "console";

  if (provider === "aliyun") {
    await sendViaAliyun(phone, code);
    return;
  }

  if (process.env.NODE_ENV === "production") {
    // 生产环境没配真实短信通道时直接报错，避免出现"谁都登不进"或调试通道泄漏
    throw new Error("SMS_PROVIDER 未配置，生产环境必须接入真实短信服务");
  }
  console.log(`[sms:console] 发送验证码到 ${phone}: ${code}`);
}

export function isConsoleProvider() {
  return (process.env.SMS_PROVIDER ?? "console") === "console";
}

/* ── 阿里云短信（dysmsapi，RPC 签名 V1.0，无 SDK 依赖） ── */

function percentEncode(s: string) {
  return encodeURIComponent(s)
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/!/g, "%21");
}

async function sendViaAliyun(phone: string, code: string) {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;
  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    throw new Error("阿里云短信环境变量不完整（ALIYUN_ACCESS_KEY_ID/SECRET/SMS_SIGN_NAME/SMS_TEMPLATE_CODE）");
  }

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    RegionId: "cn-hangzhou",
    SignName: signName,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: randomUUID(),
    SignatureVersion: "1.0",
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    Version: "2017-05-25",
  };

  const canonical = Object.keys(params)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");
  const stringToSign = `GET&${percentEncode("/")}&${percentEncode(canonical)}`;
  const signature = createHmac("sha1", accessKeySecret + "&").update(stringToSign).digest("base64");

  const url = `https://dysmsapi.aliyuncs.com/?Signature=${percentEncode(signature)}&${canonical}`;
  const res = await fetch(url);
  const body = (await res.json()) as { Code?: string; Message?: string };
  if (body.Code !== "OK") {
    console.error("[sms:aliyun] 发送失败", body);
    throw new Error(`短信发送失败：${body.Message ?? body.Code ?? "未知错误"}`);
  }
}
