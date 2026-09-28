import React, { useState, useRef, useEffect, Component } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  BrainCircuit, 
  ChevronDown, 
  ChevronRight, 
  X, 
  Sparkles, 
  RotateCcw 
} from 'lucide-react';

class MarkdownErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-rose-500 text-xs p-2 bg-rose-50 dark:bg-rose-950/30 rounded border border-rose-200">
          Markdown render issue: {this.state.error?.message}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ChatPanel({
  isOpen,
  onClose,
  initialPrompt,
  onClearInitialPrompt,
  contextData,
}) {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content:
        'Hello! I am your **Workforce Management AI Assistant**, backed by Google ADK multi-agent specialists, BigQuery schedule data, and the Vertex AI RAG knowledge base.\n\nAsk me about interval staffing deficits, 80/20 SLA risks, or 4-tier schedule optimization recommendations!',
      suggestions: [
        'Which intervals have critical SLA breach risks?',
        'How can we reschedule offline training to fix Monday morning gaps?',
        'Explain the Mock Planner v0.7 base plan calculation logic.',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedThoughts, setExpandedThoughts] = useState({});
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Dynamic textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
      textareaRef.current.style.overflowY = scrollHeight > 120 ? 'auto' : 'hidden';
    }
  }, [input]);

  // Handle initialPrompt passed from InvestigationDrawer
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSend(null, initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, isOpen]);

  const toggleThought = (idx) => {
    setExpandedThoughts((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleSend = async (e, overrideText = null) => {
    e?.preventDefault();
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    if (!overrideText) setInput('');
    setIsLoading(true);

    const currentMessages = [...messages, { role: 'user', content: textToSend.trim() }];
    const nextIdx = currentMessages.length;
    let thinking = '';
    let reply = '';
    let suggestions = [];

    // Append model placeholder
    setMessages([
      ...currentMessages,
      { role: 'model', content: '', thoughts: '', suggestions: [] },
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: currentMessages.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content || '',
          })),
          context: contextData ? JSON.stringify(contextData) : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        setIsLoading(false);
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep uncompleted chunk

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'THOUGHT') {
                  thinking += parsed.content + '\n';
                } else if (parsed.type === 'SUGGESTION') {
                  suggestions.push(parsed.content);
                } else {
                  reply += parsed.content;
                }

                setMessages((prev) => {
                  const updated = [...prev];
                  updated[nextIdx] = {
                    role: 'model',
                    content: reply,
                    thoughts: thinking,
                    suggestions: suggestions,
                  };
                  return updated;
                });
              } catch (err) {
                console.error('SSE JSON parse fail:', dataStr, err);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages([
        ...currentMessages,
        {
          role: 'model',
          content: `⚠️ **Connection Error**: Unable to communicate with the ADK backend server (${err.message}). Ensure the FastAPI server is running on port 8000.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'model',
        content: 'Chat session refreshed. What would you like to analyze next?',
        suggestions: [
          'Which intervals have critical SLA breach risks?',
          'What offline training can we reschedule to the afternoon?',
        ],
      },
    ]);
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[460px] bg-white dark:bg-[#0c0c0f] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4 text-blue-100" />
          </div>
          <div>
            <div className="font-semibold text-sm text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
              WFM AI Assistant
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Google ADK Multi-Agent Orchestrator
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetChat}
            title="Reset Conversation"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-blue-500" />}
            </div>

            <div className="max-w-[85%] flex flex-col gap-2">
              {/* 1. Thoughts Collapsible Box */}
              {m.role === 'model' && m.thoughts && m.thoughts.trim().length > 0 && (
                <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                  <button
                    onClick={() => toggleThought(i)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    {expandedThoughts[i] ? (
                      <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                    )}
                    <BrainCircuit className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span className="truncate text-left font-mono">
                      {(() => {
                        if (m.content && m.content.length > 0) return 'View agent reasoning & tool execution';
                        const lines = m.thoughts.split('\n').filter((l) => l.trim().length > 0);
                        return lines.length > 0 ? lines[lines.length - 1] : 'Analyzing BigQuery schedules...';
                      })()}
                    </span>
                  </button>

                  {expandedThoughts[i] && (
                    <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-black/30 max-h-[220px] overflow-y-auto text-[10.5px] font-mono leading-relaxed text-zinc-600 dark:text-zinc-400 flex flex-col gap-1.5">
                      {m.thoughts
                        .split('\n')
                        .filter((l) => l.trim().length > 0)
                        .map((line, idx) => (
                          <div key={idx} className="flex gap-1.5 items-start">
                            <span className="text-blue-500 mt-[1px]">›</span>
                            <span className="break-words whitespace-pre-wrap">{line}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Thinking Loading Pulse */}
              {m.role === 'model' && !m.content && !expandedThoughts[i] && (
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 italic py-1 px-2">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                  {m.thoughts ? 'Coordinating subagents...' : 'Querying BigQuery & knowledge base...'}
                </div>
              )}

              {/* 3. Final Content (Markdown) */}
              {m.content && (
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-zinc-100 dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-zinc-800/80 shadow-xs'
                  }`}
                >
                  {m.role === 'model' ? (
                    <MarkdownErrorBoundary>
                      <div className="[&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:ml-4 [&>h3]:font-bold [&>h3]:text-zinc-900 dark:[&>h3]:text-zinc-100 [&>h3]:mb-1 [&>h3]:mt-2 [&>ol]:list-decimal [&>ol]:ml-4 [&_table]:w-full [&_table]:border [&_table]:border-zinc-300 dark:[&_table]:border-zinc-700 [&_table]:my-2 [&_th]:bg-zinc-200 dark:[&_th]:bg-zinc-800 [&_th]:p-1.5 [&_td]:border [&_td]:p-1.5 [&_code]:bg-black/5 dark:[&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded font-sans">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </MarkdownErrorBoundary>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              )}

              {/* 4. Smart Follow-Up Suggestions */}
              {m.role === 'model' && m.suggestions && m.suggestions.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {m.suggestions.slice(0, 3).map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(null, s)}
                      disabled={isLoading}
                      className="text-left text-[11px] bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 p-2 rounded-lg border border-blue-200 dark:border-blue-900/50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] relative flex items-end gap-2"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask WFM Agent (e.g. 'Optimize Monday morning deficits')..."
          rows={1}
          className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-3 pr-10 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all disabled:opacity-40 disabled:hover:bg-blue-600 shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
