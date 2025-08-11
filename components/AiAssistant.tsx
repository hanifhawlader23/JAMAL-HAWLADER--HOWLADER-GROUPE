
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../hooks/useData';

const AiAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
    const { documents, clients, products, entries } = useData();
    const chatContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContentRef.current) {
            chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
        }
    }, [chatHistory, isLoading]);
    
    const summarizeDataForAI = () => {
        const summary = {
            clients: clients.map(c => ({ id: c.id, name: c.name })),
            products: products.map(p => ({ id: p.id, name: p.modelName, price: p.price, category: p.category })),
            documents: documents.map(d => ({ 
                docNumber: d.documentNumber, 
                client: clients.find(c=>c.id === d.clientId)?.name,
                date: d.date, 
                total: d.total, 
                status: d.paymentStatus 
            })).slice(-50), // last 50 docs to save tokens
            entries: entries.map(e => ({
                code: e.code,
                client: clients.find(c=>c.id === e.clientId)?.name,
                date: e.date,
                status: e.status,
                itemCount: e.items.length,
            })).slice(-50),
        };
        return JSON.stringify(summary, null, 2);
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        
        const userMessage = { role: 'user', content: input };
        setChatHistory(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const dataContext = summarizeDataForAI();
            
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userMessage.content,
                    dataContext: dataContext,
                }),
            });

            if (!response.ok || !response.body) {
                const errorData = await response.json().catch(() => ({error: 'API request failed'}));
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let currentAiMessage = { role: 'model', content: '' };
            
            // Add a placeholder for the AI response
            setChatHistory(prev => [...prev, currentAiMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkText = decoder.decode(value, { stream: true });
                currentAiMessage.content += chunkText;
                
                // Update the last message in the history with the new content
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { ...currentAiMessage };
                    return newHistory;
                });
            }

        } catch (error: any) {
            console.error("AI Assistant Error:", error);
            const errorMessage = { role: 'model', content: `Sorry, I encountered an error: ${error.message}` };
            setChatHistory(prev => {
                 const newHistory = [...prev];
                 // Replace the placeholder if it exists, otherwise add new error message
                 if (newHistory.length > 0 && newHistory[newHistory.length - 1].role === 'model' && newHistory[newHistory.length - 1].content === '') {
                     newHistory[newHistory.length - 1] = errorMessage;
                 } else {
                     newHistory.push(errorMessage);
                 }
                 return newHistory;
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderContent = (content: string) => {
        const htmlContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\* (.*$)/gm, '<li>$1</li>') // Handles lists
            .replace(/(\r\n|\n|\r)/g, '<br />')
            .replace(/<br \/><li>/g, '<li>')
            .replace(/<\/li><br \/>/g, '</li>');

        const wrappedInUl = `<ul>${htmlContent.replace(/<\/li><li>/g, '</li></ul><ul><li>')}</ul>`;
        return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: wrappedInUl }} />;
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 btn-3d primary rounded-full w-16 h-16 flex items-center justify-center shadow-2xl z-40"
                aria-label="Open AI Assistant"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 00-1-1v-.5a1.5 1.5 0 01-3 0v.5a1 1 0 00-1 1H6a1 1 0 01-1-1v-3a1 1 0 011-1h.5a1.5 1.5 0 000-3H6a1 1 0 01-1-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" /></svg>
            </button>
            {isOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--component-bg)] rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
                        <header className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
                            <h3 className="text-xl font-semibold text-[var(--text-accent)] flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 00-1-1v-.5a1.5 1.5 0 01-3 0v.5a1 1 0 00-1 1H6a1 1 0 01-1-1v-3a1 1 0 011-1h.5a1.5 1.5 0 000-3H6a1 1 0 01-1-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" /></svg>
                                AI Sales Assistant
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </header>
                        <main ref={chatContentRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'model' && <div className="text-2xl">🤖</div>}
                                    <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-[var(--rose-gold-base)] text-white' : 'bg-[var(--charcoal-dark)]'}`} style={{'wordWrap': 'break-word'}}>
                                      {renderContent(msg.content)}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (chatHistory.length === 0 || chatHistory[chatHistory.length - 1].role !== 'model' || chatHistory[chatHistory.length - 1].content === '') && (
                                <div className="flex justify-start">
                                    <div className="p-3 rounded-lg bg-[var(--charcoal-dark)] max-w-lg flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            )}
                        </main>
                        <footer className="p-4 border-t border-[var(--border-color)]">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask about sales, clients, or products..."
                                    className="w-full"
                                    disabled={isLoading}
                                />
                                <button onClick={handleSend} disabled={isLoading || !input.trim()} className="btn-3d primary">
                                    Send
                                </button>
                            </div>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
};

export default AiAssistant;
