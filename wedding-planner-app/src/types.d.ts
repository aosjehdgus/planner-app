import { BaseEditor } from "slate";
import { ReactEditor } from "slate-react";

export type CustomElement =
  | { type: "paragraph"; children: CustomText[] }
  | { type: "heading-one"; children: CustomText[] }
  | { type: "heading-two"; children: CustomText[] }
  | { type: "list-item"; children: CustomText[] }
  | { type: "bulleted-list"; children: CustomElement[] }; // 재귀적 구조 예시

export type CustomText = {
  text: string;
  bold?: boolean; // 필요하면 옵션 추가 가능
};

export type CustomDescendant = CustomElement | CustomText;

export type CustomEditor = BaseEditor & ReactEditor;
