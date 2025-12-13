'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

export function StrategyChat() {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/agent/md',
        maxSteps: 10,
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <Card className="flex flex-col h-[700px] shadow-lg border-2 border-primary/10">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <CardTitle>AI Strategy Consultant</CardTitle>
                </div>
                <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
                    Powered by GPT-4o & Grok
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden relative">
                <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 space-y-2">
                            <Bot size={48} />
                            <p>Ask me anything about Sales, Inventory, or Trends.</p>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                                <Button variant="outline" size="sm" onClick={() => {
                                    const e = { target: { value: "Why did sales drop last week?" } } as any;
                                    handleInputChange(e);
                                }}>Why did sales drop?</Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                    const e = { target: { value: "Suggest a promotion for Winter." } } as any;
                                    handleInputChange(e);
                                }}>Winter Promo Ideas</Button>
                            </div>
                        </div>
                    )}

                    {messages.map((m: any) => (
                        <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-purple-100 text-purple-700'
                                }`}>
                                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>

                            {/* Message Bubble */}
                            <div className={`rounded-lg px-4 py-2 max-w-[80%] text-sm ${m.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-br-none'
                                    : 'bg-muted rounded-bl-none prose dark:prose-invert max-w-none'
                                }`}>
                                {m.content ? (
                                    <div className="whitespace-pre-wrap">{m.content}</div>
                                ) : (
                                    <div className="italic text-xs opacity-70 flex items-center gap-1">
                                        <Loader2 size={12} className="animate-spin" />
                                        Thinking (Using Tools)...
                                    </div>
                                )}

                                {/* Tool Invocations Visualization */}
                                {m.toolInvocations?.map((toolInvocation: any) => (
                                    <div key={toolInvocation.toolCallId} className="mt-2 text-xs bg-background/50 p-2 rounded border border-border/50">
                                        <div className="font-semibold text-purple-600 flex items-center gap-1">
                                            Attempting to call: <span className="font-mono">{toolInvocation.toolName}</span>
                                        </div>
                                        <div className="text-muted-foreground truncate max-w-[200px]">
                                            {JSON.stringify(toolInvocation.args)}
                                        </div>
                                        {'result' in toolInvocation && (
                                            <div className="mt-1 text-green-600 font-medium">
                                                ✓ Result Received
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                                <Bot size={16} />
                            </div>
                            <div className="bg-muted px-4 py-2 rounded-lg rounded-bl-none text-sm flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Analyzing...
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t bg-background">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask your Virtual MD..."
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading} size="icon">
                        <Send size={18} />
                    </Button>
                </form>
            </div>
        </Card>
    );
}
