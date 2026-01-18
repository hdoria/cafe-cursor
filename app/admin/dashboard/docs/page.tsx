"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  pdfUrl: string | null;
  order: number;
  isPublished: boolean;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  articles: Article[];
}

export default function DocsAdminPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "" });
  const [articleForm, setArticleForm] = useState({
    title: "",
    slug: "",
    content: "",
    pdfUrl: "",
    categoryId: "",
    isPublished: true,
  });

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/docs");
      if (res.status === 401) {
        router.push("/admin");
        return;
      }
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Erro ao buscar documentação:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleAction = async (action: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/admin/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      if (res.ok) {
        fetchDocs();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro:", error);
      return false;
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, slug: category.slug });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "", slug: "" });
    }
    setShowCategoryModal(true);
  };

  const openArticleModal = (categoryId: string, article?: Article) => {
    if (article) {
      setEditingArticle(article);
      setArticleForm({
        title: article.title,
        slug: article.slug,
        content: article.content,
        pdfUrl: article.pdfUrl || "",
        categoryId: article.categoryId,
        isPublished: article.isPublished,
      });
    } else {
      setEditingArticle(null);
      setArticleForm({
        title: "",
        slug: "",
        content: "",
        pdfUrl: "",
        categoryId,
        isPublished: true,
      });
    }
    setSelectedCategoryId(categoryId);
    setShowArticleModal(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name) return;
    const slug = categoryForm.slug || generateSlug(categoryForm.name);
    
    if (editingCategory) {
      await handleAction("updateCategory", { id: editingCategory.id, name: categoryForm.name, slug });
    } else {
      await handleAction("createCategory", { name: categoryForm.name, slug });
    }
    setShowCategoryModal(false);
  };

  const deleteCategory = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta categoria e todos os artigos?")) {
      await handleAction("deleteCategory", { id });
    }
  };

  const saveArticle = async () => {
    if (!articleForm.title || !articleForm.categoryId) return;
    const slug = articleForm.slug || generateSlug(articleForm.title);
    
    if (editingArticle) {
      await handleAction("updateArticle", { id: editingArticle.id, ...articleForm, slug });
    } else {
      await handleAction("createArticle", { ...articleForm, slug });
    }
    setShowArticleModal(false);
  };

  const deleteArticle = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este artigo?")) {
      await handleAction("deleteArticle", { id });
    }
  };

  const togglePublished = async (article: Article) => {
    await handleAction("updateArticle", { id: article.id, isPublished: !article.isPublished });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
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

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="mb-2 text-sm text-gray-400 hover:text-white"
            >
              ← Voltar ao Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white">Documentação</h1>
            <p className="text-gray-400">Gerencie artigos e guias do Cursor</p>
          </div>
          <button
            onClick={() => openCategoryModal()}
            className="rounded-lg bg-white px-4 py-2 font-medium text-black transition-opacity hover:opacity-90"
          >
            + Nova Categoria
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <span className="mb-4 block text-6xl">📚</span>
            <h2 className="mb-2 text-xl font-bold text-white">Nenhuma documentação</h2>
            <p className="mb-4 text-gray-400">
              Comece criando uma categoria para organizar seus artigos.
            </p>
            <button
              onClick={() => openCategoryModal()}
              className="rounded-lg bg-white px-4 py-2 font-medium text-black"
            >
              Criar Primeira Categoria
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-white/10 p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📁</span>
                    <div>
                      <h3 className="font-semibold text-white">{category.name}</h3>
                      <p className="text-sm text-gray-400">/{category.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openArticleModal(category.id)}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
                    >
                      + Artigo
                    </button>
                    <button
                      onClick={() => openCategoryModal(category)}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/30"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {category.articles.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    Nenhum artigo nesta categoria
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {category.articles.map((article) => (
                      <div
                        key={article.id}
                        className="flex items-center justify-between p-4 hover:bg-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📄</span>
                          <div>
                            <h4 className="font-medium text-white">{article.title}</h4>
                            <p className="text-sm text-gray-400">/{article.slug}</p>
                          </div>
                          {article.pdfUrl && (
                            <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                              📎 PDF
                            </span>
                          )}
                          {!article.isPublished && (
                            <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                              Rascunho
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => togglePublished(article)}
                            className={`rounded-lg px-3 py-1.5 text-sm ${
                              article.isPublished
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                            }`}
                          >
                            {article.isPublished ? "Publicado" : "Publicar"}
                          </button>
                          <button
                            onClick={() => openArticleModal(category.id, article)}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteArticle(article.id)}
                            className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/30"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
          <a
            href="/docs"
            target="_blank"
            className="flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <span>👁️</span>
            <span>Visualizar documentação pública</span>
            <span className="ml-auto">→</span>
          </a>
        </div>
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
            <h2 className="mb-4 text-xl font-bold text-white">
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Nome</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                  placeholder="Ex: Boas Práticas"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Slug (URL)</label>
                <input
                  type="text"
                  value={categoryForm.slug || generateSlug(categoryForm.name)}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                  placeholder="boas-praticas"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20"
              >
                Cancelar
              </button>
              <button
                onClick={saveCategory}
                className="rounded-lg bg-white px-4 py-2 font-medium text-black"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {showArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
            <h2 className="mb-4 text-xl font-bold text-white">
              {editingArticle ? "Editar Artigo" : "Novo Artigo"}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Título</label>
                  <input
                    type="text"
                    value={articleForm.title}
                    onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                    placeholder="Ex: Introdução ao Cursor"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Slug (URL)</label>
                  <input
                    type="text"
                    value={articleForm.slug || generateSlug(articleForm.title)}
                    onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                    placeholder="introducao-ao-cursor"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Categoria</label>
                <select
                  value={articleForm.categoryId}
                  onChange={(e) => setArticleForm({ ...articleForm, categoryId: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-[#1a1a1a]">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Conteúdo (Markdown)
                </label>
                <textarea
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  className="h-64 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white"
                  placeholder="# Título&#10;&#10;Escreva seu conteúdo em Markdown..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  URL do PDF (opcional)
                </label>
                <input
                  type="url"
                  value={articleForm.pdfUrl}
                  onChange={(e) => setArticleForm({ ...articleForm, pdfUrl: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                  placeholder="https://exemplo.com/documento.pdf"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Cole o link de um PDF externo (Google Drive, Dropbox, etc.)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={articleForm.isPublished}
                  onChange={(e) => setArticleForm({ ...articleForm, isPublished: e.target.checked })}
                  className="h-4 w-4 rounded border-white/10 bg-white/5"
                />
                <label htmlFor="isPublished" className="text-sm text-gray-400">
                  Publicar artigo
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowArticleModal(false)}
                className="rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20"
              >
                Cancelar
              </button>
              <button
                onClick={saveArticle}
                className="rounded-lg bg-white px-4 py-2 font-medium text-black"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
