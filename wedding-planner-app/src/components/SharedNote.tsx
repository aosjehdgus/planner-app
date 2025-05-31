import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

import { createEditor, type BaseText, type Descendant } from "slate";
import { Slate, Editable, withReact } from "slate-react";

import { Container, Box, Typography, CircularProgress } from "@mui/material";

const docId = "shared_note";

const initialValue: BaseText[] = [{ text: "" }];

export default function SharedNote() {
  const [value, setValue] = useState<Descendant[]>(initialValue);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSomeoneTyping, setIsSomeoneTyping] = useState(false);

  const editor = useMemo(() => withReact(createEditor()), []);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const typingDocRef = doc(db, "notes", docId + "_typing");
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setTypingStatus = useCallback(
    async (typing: boolean) => {
      if (isTypingRef.current !== typing) {
        isTypingRef.current = typing;
        await setDoc(
          typingDocRef,
          { isTyping: typing, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
    },
    [typingDocRef]
  );

  const scheduleSave = useCallback((newValue: Descendant[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      await setDoc(doc(db, "notes", docId), {
        content: newValue,
        updatedAt: serverTimestamp(),
      });

      setTimeout(() => {
        setIsSaving(false);
      }, 2000);
    }, 1000);
  }, []);

  const onChange = useCallback(
    (newValue: Descendant[]) => {
      setValue(newValue);
      scheduleSave(newValue);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      if (!isTypingRef.current) {
        setTypingStatus(true);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(false);
      }, 2000);
    },
    [scheduleSave, setTypingStatus]
  );

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "notes", docId), (docSnap) => {
      if (docSnap.exists()) {
        setValue(docSnap.data().content ?? initialValue);
      } else {
        setValue(initialValue);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(typingDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsSomeoneTyping(data.isTyping ?? false);
      } else {
        setIsSomeoneTyping(false);
      }
    });
    return () => unsub();
  }, [typingDocRef]);

  return (
    <Container
      gap={2}
      component={Box}
      display={"flex"}
      flexDirection="column"
      width={"100%"}
      p={3}
    >
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography variant="h5" fontWeight={700}>
          뚜동 Wedding Live Notes
        </Typography>
        {isSaving && (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              저장 중입니다...
            </Typography>
            <CircularProgress size={16} thickness={4} color="info" />
          </Box>
        )}

        {!isSaving && isSomeoneTyping && (
          <Typography variant="body2" color="text.secondary" ml={2}>
            누군가 입력 중입니다...
          </Typography>
        )}
      </Box>
      {loading ? (
        <CircularProgress size={24} thickness={4} />
      ) : (
        <Slate editor={editor} initialValue={value} onChange={onChange}>
          <Editable
            placeholder="여기에 노트를 작성하세요..."
            style={{
              minHeight: "300px",
              fontSize: "1rem",
              lineHeight: 1.5,
              outline: "none",
              border: "none",
              background: "transparent",
              width: "100%",
            }}
          />
        </Slate>
      )}
    </Container>
  );
}
