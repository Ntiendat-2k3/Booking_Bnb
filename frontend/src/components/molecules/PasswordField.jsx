"use client";

import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import InputField from "@/components/atoms/InputField";
import IconButton from "@/components/atoms/IconButton";
import { useTranslations } from "@/i18n/LocaleProvider";

export default function PasswordField(props) {
  const t = useTranslations();
  const [visible, setVisible] = useState(false);
  return <InputField {...props} type={visible ? "text" : "password"} inputClassName="pr-14"
    suffix={<IconButton label={t(visible ? "auth.hidePassword" : "auth.showPassword")} aria-pressed={visible} disabled={props.disabled} onClick={() => setVisible((value) => !value)} className="border-0 bg-transparent"><span aria-hidden>{visible ? <EyeSlash size={20} /> : <Eye size={20} />}</span></IconButton>}
  />;
}
