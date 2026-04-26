import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Info, ArrowRight, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useSiteConfig } from "@/hooks/useSiteConfig";

type Message = {
  id: string;
  role: "bot" | "user";
  content: string;
  timestamp: Date;
  type?: "text" | "options" | "contact";
  options?: { label: string; value: string }[];
};

export const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Message de bienvenue
      setIsTyping(true);
      setTimeout(() => {
        const welcomeMessage: Message = {
          id: "1",
          role: "bot",
          content: "Bonjour ! Je suis l'assistant virtuel de CoopZig. Comment puis-je vous aider aujourd'hui ?",
          timestamp: new Date(),
          type: "options",
          options: [
            { label: "💰 Voir les prix du marché", value: "prix" },
            { label: "📦 Nos produits disponibles", value: "produits" },
            { label: "📞 Contacter la coopérative", value: "contact" },
            { label: "🌍 Qui sommes-nous ?", value: "about" }
          ]
        };
        setMessages([welcomeMessage]);
        setIsTyping(false);
      }, 1000);
    }
  }, [isOpen]);

  const handleOptionClick = (value: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: getOptionLabel(value),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    processResponse(value);
  };

  const getOptionLabel = (value: string) => {
    switch (value) {
      case "prix": return "Quels sont les prix actuels ?";
      case "produits": return "Quels produits proposez-vous ?";
      case "contact": return "Je souhaite vous contacter.";
      case "about": return "Parlez-moi de la coopérative.";
      default: return value;
    }
  };

  const processResponse = async (query: string) => {
    setIsTyping(true);
    
    try {
      const { data: configs } = await supabase.from("site_config").select("*").eq("categorie", "ia_config");
      const apiKey = configs?.find(c => c.cle === "chatbot_api_key")?.valeur;
      const provider = configs?.find(c => c.cle === "chatbot_provider")?.valeur || "openai";
      const model = configs?.find(c => c.cle === "chatbot_model")?.valeur || "gpt-4o";

      if (!apiKey) {
        // Fallback to static logic if no API key
        setTimeout(() => {
          let response: Message = {
            id: (Date.now() + 1).toString(),
            role: "bot",
            content: "",
            timestamp: new Date()
          };

          if (query.toLowerCase().includes("prix")) {
            response.content = "Vous pouvez consulter les cotations en temps réel sur notre observatoire des prix. Nous suivons les produits comme la Mangue, l'Anacarde et le Riz.";
          } else if (query.toLowerCase().includes("produit")) {
            response.content = "La coopérative propose une large gamme de produits certifiés : Mangues Kent, Noix d'anacarde, Riz local et bien d'autres. Voulez-vous voir le catalogue ?";
            response.type = "options";
            response.options = [{ label: "📖 Voir le catalogue", value: "view_catalog" }];
          } else if (query.toLowerCase().includes("contact")) {
            response.content = "Vous pouvez nous envoyer un message directement ici. Quel est l'objet de votre demande ?";
            response.type = "contact";
          } else {
            response.content = "Je suis l'assistant CoopZig. Posez-moi vos questions sur nos produits, nos prix ou notre coopérative.";
          }

          setMessages(prev => [...prev, response]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      // Real AI Call
      const aiResponse = await callAI(query, messages, apiKey, provider, model);
      
      const response: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error("Chatbot AI Error:", error);
      toast.error("Erreur de connexion avec l'IA");
    } finally {
      setIsTyping(false);
    }
  };

  const callAI = async (prompt: string, history: Message[], key: string, provider: string, model: string): Promise<string> => {
    const systemPrompt = "Tu es l'assistant virtuel de CoopZig Ziguinchor-Casamance, une coopérative agricole au Sénégal. Réponds en français, de manière concise et utile sur les sujets agricoles, commerciaux et coopératifs.";

    const messagesForAI = [
      { role: "system", content: systemPrompt },
      ...history.slice(-5).map(m => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.content
      })),
      { role: "user", content: prompt }
    ];

    const ENDPOINTS: Record<string, string> = {
      openai:  "https://api.openai.com/v1/chat/completions",
      groq:    "https://api.groq.com/openai/v1/chat/completions",
      mistral: "https://api.mistral.ai/v1/chat/completions",
    };
    const DEFAULT_MODELS: Record<string, string> = {
      openai:  "gpt-4o",
      groq:    "llama3-70b-8192",
      mistral: "mistral-large-latest",
    };

    const endpoint = ENDPOINTS[provider] || ENDPOINTS.openai;
    // Utilise le modèle natif du provider si : modèle vide, modèle = nom d'un provider,
    // ou modèle openai-only (gpt-4o) envoyé à un autre provider.
    const PROVIDER_NAMES = new Set(Object.keys(ENDPOINTS));
    const isInvalidModel = !model || PROVIDER_NAMES.has(model) || (model === "gpt-4o" && provider !== "openai");
    const resolvedModel = isInvalidModel ? (DEFAULT_MODELS[provider] || "llama3-70b-8192") : model;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: messagesForAI
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Erreur ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err: any) {
      console.error("Fetch Error:", err);
      return `Désolé, une erreur est survenue : ${err?.message || "connexion impossible"}. Vérifiez la clé API et le fournisseur dans les paramètres IA.`;
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const query = inputValue;
    setInputValue("");
    processResponse(query);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-[380px] max-w-[calc(100vw-48px)] h-[550px] max-h-[calc(100vh-120px)] bg-white dark:bg-[#0d1525] rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-black/[0.03] dark:border-white/[0.05] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-[#1A2E1C] p-6 text-white relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    <Bot size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Assistant CoopZig</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">En ligne</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex flex-col",
                  msg.role === "user" ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user" 
                      ? "bg-[#1A2E1C] text-white rounded-tr-none shadow-md" 
                      : "bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-200 rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                  
                  {msg.type === "options" && msg.options && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleOptionClick(opt.value)}
                          className="px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all shadow-sm"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.role === "bot" && msg.content.includes("observatoire des prix") && (
                    <Link 
                      to="/prix" 
                      onClick={() => setIsOpen(false)}
                      className="mt-2 flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-wider"
                    >
                      Accéder aux prix <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-center gap-2 text-gray-400 px-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">L'assistant réfléchit...</span>
                </div>
              ) }
              <div ref={messagesEndRef} />
            </div>

            {/* Footer / Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-gray-50 dark:bg-white/[0.02] border-t border-black/[0.03] dark:border-white/[0.05] shrink-0">
              <div className="relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Écrivez votre message..."
                  className="pr-12 h-12 bg-white dark:bg-[#131d2e] border-none rounded-2xl shadow-sm focus-visible:ring-emerald-500/20 text-sm"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                    inputValue.trim() ? "bg-[#1A2E1C] text-white shadow-md" : "bg-gray-100 text-gray-400"
                  )}
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-[9px] text-center text-gray-400 mt-3 font-medium uppercase tracking-tight opacity-50">
                CoopZig Assistant Virtual · Service Client
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500",
          isOpen 
            ? "bg-white text-[#1A2E1C] rotate-0" 
            : "bg-[#1A2E1C] text-white rotate-0"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-[#0d1525] rounded-full animate-bounce" />
        )}
      </motion.button>
    </div>
  );
};
