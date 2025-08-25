import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export default function RichTextEditor({ value, onChange, className }: Props) {
  const editor = useEditor({
    extensions: [StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    })],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // keep external value in sync
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className={`border rounded-lg bg-white text-black p-4 ${className || ""}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg bg-white text-black p-4 ${className || ""}`}> 
      <div className="toolbar mb-3 flex gap-1 pb-2 border-b border-gray-200">
        <button 
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 border rounded text-sm font-semibold transition-all ${
            editor.isActive('bold') 
              ? 'bg-blue-500 text-white border-blue-500' 
              : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
          }`}
          title="Fett (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 border rounded text-sm font-medium transition-all ${
            editor.isActive('italic') 
              ? 'bg-blue-500 text-white border-blue-500' 
              : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
          }`}
          title="Kursiv (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 border rounded text-sm transition-all ${
            editor.isActive('bulletList') 
              ? 'bg-blue-500 text-white border-blue-500' 
              : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
          }`}
          title="Aufzählung"
        >
          • Liste
        </button>
        
        {/* Additional formatting buttons for better German business letter formatting */}
        <div className="border-l border-gray-300 ml-2 pl-2 flex gap-1">
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-3 py-1 border rounded text-sm transition-all ${
              editor.isActive('heading', { level: 2 }) 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
            }`}
            title="Überschrift"
          >
            H2
          </button>
          <button 
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`px-3 py-1 border rounded text-sm transition-all ${
              editor.isActive('paragraph') 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
            }`}
            title="Normaler Text"
          >
            P
          </button>
        </div>
      </div>
      <EditorContent 
        editor={editor} 
        className="prose max-w-none min-h-[200px] focus-within:outline-none"
      />
    </div>
  );
} 