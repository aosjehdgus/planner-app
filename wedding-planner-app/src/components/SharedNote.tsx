import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  Fragment,
} from "react";
import { db } from "../firebase";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { createEditor, type Descendant } from "slate";
import { Slate, Editable, withReact } from "slate-react";

import {
  Container,
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Drawer,
  useMediaQuery,
  AppBar,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import MenuIcon from "@mui/icons-material/Menu";

type Note = {
  id: string;
  title: string;
  content: Descendant[];
};

type ParagraphElement = { type: "paragraph"; children: Descendant[] };

const initialContent: ParagraphElement[] = [
  { type: "paragraph", children: [{ text: "" }] },
];

export default function SharedNoteList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const editor = useMemo(() => withReact(createEditor()), []);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const notesCollectionRef = collection(db, "notes");
  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const scheduleSave = useCallback((noteId: string, content: Descendant[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      await setDoc(
        doc(db, "notes", noteId),
        {
          content,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setIsSaving(false);
    }, 1000);
  }, []);

  const onChange = useCallback(
    (newValue: Descendant[]) => {
      if (!selectedNoteId) return;

      setNotes((prev) =>
        prev.map((note) =>
          note.id === selectedNoteId ? { ...note, content: newValue } : note
        )
      );

      scheduleSave(selectedNoteId, newValue);
    },
    [selectedNoteId, scheduleSave]
  );

  const deleteNote = async (id: string) => {
    await deleteDoc(doc(db, "notes", id));
    if (selectedNoteId === id) setSelectedNoteId(null);
  };

  const handleOpenDialog = () => {
    setNewNoteTitle("");
    setOpenDialog(true);
  };
  const handleCloseDialog = () => setOpenDialog(false);

  const handleAddNote = async () => {
    if (!newNoteTitle.trim()) return;
    const count = notes.filter((note) =>
      note.title.startsWith(newNoteTitle)
    ).length;
    const finalTitle =
      count > 0 ? `${newNoteTitle} ${count + 1}` : newNoteTitle;

    const newDoc = await addDoc(notesCollectionRef, {
      title: finalTitle,
      content: initialContent,
      createdAt: serverTimestamp(),
    });

    setSelectedNoteId(newDoc.id);
    setOpenDialog(false);
    setDrawerOpen(false); // 모바일에서 닫기
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notes"), (snapshot) => {
      const newNotes: Note[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title ?? "제목 없음",
        content: doc.data().content ?? initialContent,
      }));

      setNotes(newNotes);
      if (!selectedNoteId && newNotes.length > 0) {
        setSelectedNoteId(newNotes[0].id);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [selectedNoteId]);

  const renderNoteList = (
    <Box
      width="300px"
      p={1}
      display="flex"
      flexDirection="column"
      height="100%"
      sx={{ bgcolor: "#fff" }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">노트 목록</Typography>
        <IconButton size="small" onClick={handleOpenDialog}>
          <AddIcon />
        </IconButton>
      </Box>
      {loading ? (
        <CircularProgress />
      ) : (
        <List sx={{ flexGrow: 1, overflowY: "auto" }}>
          {notes.map(({ id, title }) => (
            <ListItem
              key={id}
              sx={{
                bgcolor:
                  id === selectedNoteId
                    ? "rgba(25, 118, 210, 0.08)"
                    : "transparent",
                "&:hover": {
                  bgcolor:
                    id === selectedNoteId
                      ? "rgba(25, 118, 210, 0.15)"
                      : "rgba(0,0,0,0.04)",
                },
              }}
              secondaryAction={
                <IconButton
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(id);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              }
              disablePadding
            >
              <ListItemButton
                selected={id === selectedNoteId}
                onClick={() => {
                  setSelectedNoteId(id);
                  if (isMobile) setDrawerOpen(false);
                }}
              >
                <ListItemText primary={title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  return (
    <Fragment>
      <Container
        component={Box}
        display="flex"
        flexDirection="row"
        width="100%"
        p={3}
        minHeight="100vh"
      >
        {/* 데스크탑에선 고정 LNB */}
        {!isMobile && renderNoteList}

        <AppBar position="fixed" color="default" elevation={1}>
          {/* 모바일 햄버거 버튼 */}
          {isMobile && (
            <IconButton
              onClick={() => setDrawerOpen(true)}
              sx={{ position: "absolute", top: 16, right: 16, zIndex: 1300 }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </AppBar>

        {/* 모바일 Drawer */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          {renderNoteList}
        </Drawer>

        {/* 에디터 영역 */}
        <Box flex={1} p={2} display="flex" flexDirection="column">
          <Typography variant="h6" mb={1}>
            {selectedNote?.title || "노트를 선택하세요"}
          </Typography>
          {selectedNote ? (
            <Slate
              key={selectedNoteId}
              editor={editor}
              initialValue={selectedNote?.content || initialContent}
              onChange={onChange}
            >
              <Editable
                placeholder="여기에 노트를 작성하세요..."
                style={{
                  flexGrow: 1,
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
          ) : (
            <Typography>노트를 선택해주세요.</Typography>
          )}
          {isSaving && (
            <Box mt={1} display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">
                저장 중입니다...
              </Typography>
              <CircularProgress size={16} thickness={4} color="info" />
            </Box>
          )}
        </Box>
      </Container>

      {/* 새 노트 다이얼로그 */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>새 노트 제목 입력</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="제목"
            variant="standard"
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleAddNote} disabled={!newNoteTitle.trim()}>
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
}
