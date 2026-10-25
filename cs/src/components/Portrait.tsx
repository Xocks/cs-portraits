import { useState } from "react";
import { UserRound, ImageOff } from "lucide-react";
import { asset } from "../lib/catalogue";
import type { PlayerPhoto } from "../types";
export function Portrait({
  photo,
  alt = "",
  large = false,
  eager = false,
}: {
  photo?: PlayerPhoto;
  alt?: string;
  large?: boolean;
  eager?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  return photo && !broken ? (
    <img
      src={asset(large ? photo.localPath : photo.cardPath)}
      className={photo.framing === "full-frame" ? "portrait-full-frame" : undefined}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      width={large ? photo.width : 480}
      height={large ? photo.height : 600}
      onError={() => setBroken(true)}
    />
  ) : (
    <div className="portrait-missing">
      {broken ? <ImageOff strokeWidth={1} /> : <UserRound strokeWidth={0.8} />}
      <span>{broken ? "照片读取失败" : "暂无可靠照片"}</span>
      <small>
        {broken ? "可在资料说明中检查本地文件" : "身份与来源，值得认真对待"}
      </small>
    </div>
  );
}
