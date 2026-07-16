import { createHash, createHmac, randomUUID } from "crypto";

/*
 * 短信验证码发送，通过 SMS_PROVIDER 环境变量切换：
 *   - "console"（默认）：不真发短信，打印到服务器日志，开发用。
 *                        生产环境下拒绝发送，防止误上线。
 *   - "tencent"：腾讯云短信（推荐——服务器/域名/备案都在腾讯云，账号同一处）。
 *   - "aliyun"：阿里云短信。
 * 两个云通道都是直接签名调 API，零 SDK 依赖。
 */

export async function sendSmsCode(phone: string, code: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER ?? "console";

  if (provider === "tencent") {
    await sendViaTencent(phone, code);
    return;
  }
  if (provider === "aliyun") {
    await sendViaAliyun(phone, code);
    return;
  }

  // SMS_CONSOLE_IN_PROD=1 仅限备案期内测：验证码只打到服务器日志（docker compose logs app），
  // 不会返回给页面。正式上线（配好真实短信通道）后必须从 .env 移除这个开关。
  if (process.env.NODE_ENV === "production" && process.env.SMS_CONSOLE_IN_PROD !== "1") {
    // 生产环境没配真实短信通道时直接报错，避免出现"谁都登不进"或调试通道泄漏
    throw new Error("SMS_PROVIDER 未配置，生产环境必须接入真实短信服务");
  }
  console.log(`[sms:console] 发送验证码到 ${phone}: ${code}`);
}

export function isConsoleProvider() {
  return (process.env.SMS_PROVIDER ?? "console") === "console";
}

/* ── 腾讯云短信（SendSms，TC3-HMAC-SHA256 签名，无 SDK 依赖） ── */

const sha256hex = (s: string) => createHash("sha256").update(s).digest("hex");

async function sendViaTencent(phone: string, code: string) {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;
  const sdkAppId = process.env.TENCENT_SMS_SDK_APP_ID;
  const signName = process.env.TENCENT_SMS_SIGN_NAME;
  const templateId = process.env.TENCENT_SMS_TEMPLATE_ID;
  const region = process.env.TENCENT_SMS_REGION || "ap-guangzhou";
  if (!secretId || !secretKey || !sdkAppId || !signName || !templateId) {
    throw new Error("腾讯云短信环境变量不完整（TENCENT_SECRET_ID/SECRET_KEY/SMS_SDK_APP_ID/SMS_SIGN_NAME/SMS_TEMPLATE_ID）");
  }

  const host = "sms.tencentcloudapi.com";
  const payload = JSON.stringify({
    PhoneNumberSet: [`+86${phone}`],
    SmsSdkAppId: sdkAppId,
    SignName: signName,
    TemplateId: templateId,
    TemplateParamSet: [code],
  });

  // TC3-HMAC-SHA256 签名（https://cloud.tencent.com/document/api/382/52072）
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = [
    "POST", "/", "",
    `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:sendsms\n`,
    signedHeaders,
    sha256hex(payload),
  ].join("\n");
  const stringToSign = [
    "TC3-HMAC-SHA256", timestamp, `${date}/sms/tc3_request`, sha256hex(canonicalRequest),
  ].join("\n");
  const kDate = createHmac("sha256", `TC3${secretKey}`).update(date).digest();
  const kService = createHmac("sha256", kDate).update("sms").digest();
  const kSigning = createHmac("sha256", kService).update("tc3_request").digest();
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const res = await fetch(`https://${host}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `TC3-HMAC-SHA256 Credential=${secretId}/${date}/sms/tc3_request, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "X-TC-Action": "SendSms",
      "X-TC-Version": "2021-01-11",
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Region": region,
    },
    body: payload,
  });
  const body = (await res.json()) as {
    Response?: {
      Error?: { Code: string; Message: string };
      SendStatusSet?: { Code: string; Message: string }[];
    };
  };
  const err = body.Response?.Error;
  const status = body.Response?.SendStatusSet?.[0];
  if (err || !status || status.Code !== "Ok") {
    console.error("[sms:tencent] 发送失败", JSON.stringify(body));
    throw new Error(`短信发送失败：${err?.Message ?? status?.Message ?? "未知错误"}`);
  }
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
