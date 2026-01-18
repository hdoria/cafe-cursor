"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Article {
  id: string;
  title: string;
  slug: string;
  order: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  articles: Article[];
}

interface FullArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  pdfUrl: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function DocsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<FullArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [articleLoading, setArticleLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/docs");
      const data = await res.json();
      setCategories(data.categories || []);
      
      if (data.categories?.length > 0 && data.categories[0].articles?.length > 0) {
        loadArticle(data.categories[0].articles[0].slug);
      }
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadArticle = async (slug: string) => {
    setArticleLoading(true);
    try {
      const res = await fetch(`/api/docs/${slug}`);
      const data = await res.json();
      if (data.article) {
        setSelectedArticle(data.article);
      }
    } catch (error) {
      console.error("Error fetching article:", error);
    } finally {
      setArticleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-white">Carregando documentação...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative flex min-h-screen">
        <aside
          className={`fixed left-0 top-0 h-full w-72 border-r border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm transition-transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } z-20`}
        >
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-2xl">☕</span>
              <span className="font-semibold text-white">Cafe Cursor</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white lg:hidden"
            >
              ✕
            </button>
          </div>

          <nav className="h-[calc(100vh-4rem)] overflow-y-auto p-4">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma documentação disponível</p>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="mb-6">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
                    <span className="text-lg">📚</span>
                    {category.name}
                  </h3>
                  <ul className="space-y-1">
                    {category.articles.map((article) => (
                      <li key={article.id}>
                        <button
                          onClick={() => loadArticle(article.slug)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            selectedArticle?.slug === article.slug
                              ? "bg-white/10 text-white"
                              : "text-gray-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {article.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              ← Voltar ao início
            </Link>
          </div>
        </aside>

        <button
          onClick={() => setSidebarOpen(true)}
          className={`fixed left-4 top-4 z-10 rounded-lg bg-white/10 p-2 text-white backdrop-blur-sm transition-opacity lg:hidden ${
            sidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          ☰
        </button>

        <main
          className={`flex-1 transition-all ${sidebarOpen ? "ml-72" : "ml-0"}`}
        >
          <div className="mx-auto max-w-4xl px-8 py-12">
            {articleLoading ? (
              <div className="text-center text-gray-400">
                Carregando artigo...
              </div>
            ) : selectedArticle ? (
              <article className="prose prose-invert max-w-none">
                <div className="mb-8">
                  <span className="mb-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-gray-400">
                    {selectedArticle.category.name}
                  </span>
                  <h1 className="text-4xl font-bold text-white">
                    {selectedArticle.title}
                  </h1>
                  {selectedArticle.pdfUrl && (
                    <a
                      href={selectedArticle.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Baixar PDF
                    </a>
                  )}
                </div>

                <div className="prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-code:rounded prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-gray-200 prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-white/10 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-300 prose-blockquote:border-l-white/30 prose-blockquote:text-gray-400">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedArticle.content}
                  </ReactMarkdown>
                </div>
              </article>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="mb-4 text-6xl">📖</span>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  Documentação
                </h2>
                <p className="text-gray-400">
                  Selecione um artigo no menu lateral para começar a ler.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
