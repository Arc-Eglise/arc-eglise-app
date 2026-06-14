"use client";

import Image from "next/image";
import { useRef } from "react";

interface Props {
  currentUrl: string | null;
  initiale: string;
  action: (formData: FormData) => Promise<void>;
}

export default function AvatarUpload({ currentUrl, initiale, action }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef  = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} encType="multipart/form-data" className="group relative flex-shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-16 h-16 rounded-2xl overflow-hidden bg-arc-navy border-2 border-white shadow-arc flex items-center justify-center focus:outline-none"
        title="Changer la photo"
      >
        {currentUrl ? (
          <Image src={currentUrl} alt="Avatar" width={64} height={64} className="w-full h-full object-cover" />
        ) : (
          <span className="font-serif text-xl font-bold text-white">{initiale}</span>
        )}
        <span className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-arc-navy/30 rounded-2xl">
          <span className="text-[9px] font-bold bg-arc-navy/80 text-white px-1.5 py-0.5 rounded">Modifier</span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        name="avatar"
        accept="image/*"
        className="hidden"
        onChange={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
