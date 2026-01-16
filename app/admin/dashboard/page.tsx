"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Credit {
  id: string;
  code: string;
  link: string;
  isUsed: boolean;
  isTest: boolean;
  assignedAt: string | null;
  createdAt: string;
  assignedTo: {
    email: string;
    name: string;
  } | null;
}

interface EligibleUser {
  id: string;
  email: string;
  name: string;
  company: string | null;
  approvalStatus: string;
  hasCheckedIn: boolean;
  checkedInAt: string | null;
  hasClaimed: boolean;
  claimedAt: string | null;
  credit: Credit | null;
}

interface Stats {
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  testCredits: number;
  realCredits: number;
  totalEligible: number;
  claimedUsers: number;
  approvedUsers: number;
  pendingUsers: number;
}

interface DashboardData {
  stats: Stats;
  credits: Credit[];
  eligibleUsers: EligibleUser[];
}

/**
 * Dashboard de administración
 */
export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "credits">("users");
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [showUploadCsvModal, setShowUploadCsvModal] = useState(false);
  const [showUploadGuestsModal, setShowUploadGuestsModal] = useState(false);
  const [showImportDropdown, setShowImportDropdown] = useState(false);

  // Verificar autenticación y cargar datos
  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401) {
        router.push("/admin");
        return;
      }
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch (err) {
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin");
  };

  const executeAction = async (action: string, actionData: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data: actionData }),
      });
      const json = await res.json();
      if (json.error) {
        alert(`Error: ${json.error}`);
      } else {
        alert(json.message || "Acción completada");
        fetchDashboard(); // Recargar datos
      }
    } catch (err) {
      alert("Error ejecutando acción");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignCredit = async (email: string, useTest: boolean = false) => {
    if (confirm(`¿Asignar crédito ${useTest ? "de TEST" : "real"} a ${email}?`)) {
      await executeAction("ASSIGN_CREDIT", { email, useTestCredit: useTest });
    }
  };

  const handleRevokeCredit = async (userId: string, email: string) => {
    if (confirm(`¿Revocar crédito de ${email}? El crédito quedará disponible nuevamente.`)) {
      await executeAction("REVOKE_CREDIT", { userId });
    }
  };

  const handleSendEmail = async (userId: string, email: string) => {
    const locale = confirm(`Enviar email em português?\n\nOK = Português (pt-BR)\nCancelar = English (en)`) ? "pt-BR" : "en";
    await executeAction("SEND_CREDIT_EMAIL", { userId, locale });
  };

  const handleCheckIn = async (userId: string, email: string) => {
    if (confirm(`Fazer check-in de ${email}?`)) {
      await executeAction("CHECK_IN_USER", { userId });
    }
  };

  const handleUndoCheckIn = async (userId: string, email: string) => {
    if (confirm(`Desfazer check-in de ${email}?`)) {
      await executeAction("UNDO_CHECK_IN", { userId });
    }
  };

  // Filtrar datos
  const filteredUsers = data?.eligibleUsers.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.company && u.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredCredits = data?.credits.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.link.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-white">Carregando painel...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Grid de fondo */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-20" />

      {/* Header */}
      <header className="relative border-b border-gray-800 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <svg
              className="h-8 w-8"
              viewBox="0 0 466.73 532.09"
              fill="currentColor"
            >
              <path d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39Z" />
            </svg>
            <div>
              <h1 className="text-lg font-bold">Cafe Cursor Admin</h1>
              <p className="text-xs text-gray-400">Painel de Administração</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="relative mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <StatCard
            label="Créditos Totais"
            value={data?.stats.totalCredits || 0}
            color="blue"
          />
          <StatCard
            label="Disponíveis"
            value={data?.stats.availableCredits || 0}
            color="green"
          />
          <StatCard
            label="Usados"
            value={data?.stats.usedCredits || 0}
            color="orange"
          />
          <StatCard
            label="De Test"
            value={data?.stats.testCredits || 0}
            color="purple"
          />
          <StatCard
            label="Usuários Elegíveis"
            value={data?.stats.totalEligible || 0}
            color="cyan"
          />
          <StatCard
            label="Já Resgataram"
            value={data?.stats.claimedUsers || 0}
            color="pink"
          />
        </div>

        {/* Controles */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("users")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "users"
                  ? "bg-white text-black"
                  : "border border-gray-700 hover:bg-gray-800"
              }`}
            >
              👥 Usuários ({data?.eligibleUsers.length})
            </button>
            <button
              onClick={() => setActiveTab("credits")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "credits"
                  ? "bg-white text-black"
                  : "border border-gray-700 hover:bg-gray-800"
              }`}
            >
              🎫 Créditos ({data?.credits.length})
            </button>
          </div>

          {/* Busca e ações */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Buscar por email ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm placeholder:text-gray-500 focus:border-white focus:outline-none"
            />
            <button
              onClick={() => setShowAddUserModal(true)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700"
            >
              + Usuário
            </button>
            <button
              onClick={() => setShowAddCreditModal(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700"
            >
              + Crédito
            </button>
            <div className="relative">
              <button
                onClick={() => setShowImportDropdown(!showImportDropdown)}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-700"
              >
                📥 Importar ▾
              </button>
              {showImportDropdown && (
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl">
                  <button
                    onClick={() => {
                      setShowUploadCsvModal(true);
                      setShowImportDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800"
                  >
                    🎫 Créditos (CSV)
                  </button>
                  <button
                    onClick={() => {
                      setShowUploadGuestsModal(true);
                      setShowImportDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800"
                  >
                    👥 Guests (Luma CSV)
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={fetchDashboard}
              disabled={actionLoading}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              🔄 Recargar
            </button>
          </div>
        </div>

        {/* Tabela de Usuários */}
        {activeTab === "users" && (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Check-in</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Crédito</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredUsers?.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3 text-gray-400">{user.company || "-"}</td>
                    <td className="px-4 py-3">
                      {user.hasCheckedIn ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                          ✓ Check-in
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-500/20 px-2 py-1 text-xs text-gray-400">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.approvalStatus} />
                    </td>
                    <td className="px-4 py-3">
                      {user.hasClaimed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                          ✓ {user.credit?.code}
                          {user.credit?.isTest && " (TEST)"}
                        </span>
                      ) : (
                        <span className="text-gray-500">Não atribuído</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {!user.hasCheckedIn ? (
                          <button
                            onClick={() => handleCheckIn(user.id, user.email)}
                            disabled={actionLoading}
                            className="rounded bg-green-600 px-2 py-1 text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            Check-in
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUndoCheckIn(user.id, user.email)}
                            disabled={actionLoading}
                            className="rounded bg-gray-600 px-2 py-1 text-xs hover:bg-gray-700 disabled:opacity-50"
                          >
                            Desfazer
                          </button>
                        )}
                        {!user.hasClaimed && user.approvalStatus === "approved" && user.hasCheckedIn && (
                          <>
                            <button
                              onClick={() => handleAssignCredit(user.email, false)}
                              disabled={actionLoading}
                              className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700 disabled:opacity-50"
                            >
                              Atribuir
                            </button>
                            <button
                              onClick={() => handleAssignCredit(user.email, true)}
                              disabled={actionLoading}
                              className="rounded bg-purple-600 px-2 py-1 text-xs hover:bg-purple-700 disabled:opacity-50"
                            >
                              Test
                            </button>
                          </>
                        )}
                        {user.hasClaimed && (
                          <>
                            <button
                              onClick={() => handleSendEmail(user.id, user.email)}
                              disabled={actionLoading}
                              className="rounded bg-cyan-600 px-2 py-1 text-xs hover:bg-cyan-700 disabled:opacity-50"
                              title="Enviar email com o link do crédito"
                            >
                              📧 Email
                            </button>
                            <button
                              onClick={() => handleRevokeCredit(user.id, user.email)}
                              disabled={actionLoading}
                              className="rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-700 disabled:opacity-50"
                            >
                              Revogar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabela de Créditos */}
        {activeTab === "credits" && (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Link</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Usuário</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredCredits?.map((credit) => (
                  <tr key={credit.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 font-mono text-xs">{credit.code}</td>
                    <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-gray-400">
                      {credit.link}
                    </td>
                    <td className="px-4 py-3">
                      {credit.isTest ? (
                        <span className="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-400">
                          TEST
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
                          Real
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {credit.isUsed ? (
                        <span className="rounded-full bg-orange-500/20 px-2 py-1 text-xs text-orange-400">
                          Usado
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                          Disponível
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {credit.assignedTo ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-white">{credit.assignedTo.name}</span>
                          <span className="text-xs text-gray-500">{credit.assignedTo.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {credit.assignedAt
                        ? new Date(credit.assignedAt).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Adicionar Usuário */}
      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          onSubmit={async (userData) => {
            await executeAction("ADD_ELIGIBLE_USER", userData);
            setShowAddUserModal(false);
          }}
        />
      )}

      {/* Modal Adicionar Crédito */}
      {showAddCreditModal && (
        <AddCreditModal
          onClose={() => setShowAddCreditModal(false)}
          onSubmit={async (creditData) => {
            await executeAction("ADD_CREDIT", creditData);
            setShowAddCreditModal(false);
          }}
        />
      )}

      {/* Modal Upload CSV */}
      {showUploadCsvModal && (
        <UploadCsvModal
          onClose={() => setShowUploadCsvModal(false)}
          onSuccess={() => {
            setShowUploadCsvModal(false);
            fetchDashboard();
          }}
        />
      )}

      {/* Modal Upload Guests */}
      {showUploadGuestsModal && (
        <UploadGuestsModal
          onClose={() => setShowUploadGuestsModal(false)}
          onSuccess={() => {
            setShowUploadGuestsModal(false);
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
}

// Componentes auxiliares
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "border-blue-500/30 bg-blue-500/10",
    green: "border-green-500/30 bg-green-500/10",
    orange: "border-orange-500/30 bg-orange-500/10",
    purple: "border-purple-500/30 bg-purple-500/10",
    cyan: "border-cyan-500/30 bg-cyan-500/10",
    pink: "border-pink-500/30 bg-pink-500/10",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-green-500/20 text-green-400",
    pending_approval: "bg-yellow-500/20 text-yellow-400",
    declined: "bg-red-500/20 text-red-400",
    waitlist: "bg-gray-500/20 text-gray-400",
    invited: "bg-blue-500/20 text-blue-400",
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs ${styles[status] || "bg-gray-500/20 text-gray-400"}`}>
      {status}
    </span>
  );
}

function AddUserModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#0a0a0a] p-6">
        <h2 className="mb-4 text-lg font-bold">Adicionar Usuário Elegível</h2>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-white focus:outline-none"
          />
          <input
            type="text"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-white focus:outline-none"
          />
          <input
            type="text"
            placeholder="Empresa (opcional)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-white focus:outline-none"
          />
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-700 py-3 hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit({ email, name, company, approvalStatus: "approved" })}
            className="flex-1 rounded-lg bg-white py-3 font-medium text-black hover:opacity-90"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCreditModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  const [code, setCode] = useState("");
  const [link, setLink] = useState("");
  const [isTest, setIsTest] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#0a0a0a] p-6">
        <h2 className="mb-4 text-lg font-bold">Adicionar Crédito</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Código (ex: ABC123XYZ)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-white focus:outline-none"
          />
          <input
            type="url"
            placeholder="Link completo (https://cursor.com/...)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-white focus:outline-none"
          />
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isTest}
              onChange={(e) => setIsTest(e.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-900"
            />
            <span className="text-sm text-gray-300">É crédito de teste (TEST)</span>
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-700 py-3 hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit({ code, link, isTest })}
            className="flex-1 rounded-lg bg-white py-3 font-medium text-black hover:opacity-90"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadCsvModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [csvContent, setCsvContent] = useState("");
  const [isTest, setIsTest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    errors?: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async () => {
    if (!csvContent.trim()) {
      alert("Por favor, selecione um arquivo CSV ou cole o conteúdo");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/upload-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent, isTest }),
      });

      const data = await res.json();
      setResult({
        success: data.success || false,
        message: data.message || data.error || "Erro desconhecido",
        errors: data.errors,
      });

      if (data.success && data.inserted > 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      setResult({
        success: false,
        message: "Erro de conexão",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-[#0a0a0a] p-6">
        <h2 className="mb-4 text-lg font-bold">Upload de Créditos (CSV)</h2>
        
        <p className="mb-4 text-sm text-gray-400">
          Formato esperado: cada linha com o link do crédito (o código será extraído automaticamente)
          <br />
          Exemplo: <code className="text-emerald-400">https://cursor.com/referral?code=ABC123,Nome</code>
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Selecionar arquivo CSV
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white file:mr-4 file:rounded file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Ou cole o conteúdo CSV aqui
            </label>
            <textarea
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="https://cursor.com/referral?code=ABC123,Nome&#10;https://cursor.com/referral?code=XYZ789,Nome"
              rows={6}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-white focus:outline-none font-mono text-sm"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isTest}
              onChange={(e) => setIsTest(e.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-900"
            />
            <span className="text-sm text-gray-300">Marcar como créditos de teste (TEST)</span>
          </label>

          {result && (
            <div
              className={`rounded-lg border p-4 ${
                result.success
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              <p className="font-medium">{result.message}</p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto text-xs">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-gray-400">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-700 py-3 hover:bg-gray-800 disabled:opacity-50"
          >
            {result?.success ? "Fechar" : "Cancelar"}
          </button>
          {!result?.success && (
            <button
              onClick={handleSubmit}
              disabled={loading || !csvContent.trim()}
              className="flex-1 rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Importando..." : "Importar Créditos"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadGuestsModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [csvContent, setCsvContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    errors?: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async () => {
    if (!csvContent.trim()) {
      alert("Por favor, selecione um arquivo CSV");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/upload-guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent }),
      });

      const data = await res.json();
      setResult({
        success: data.success || false,
        message: data.message || data.error || "Erro desconhecido",
        errors: data.errors,
      });

      if (data.success && data.inserted > 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      setResult({
        success: false,
        message: "Erro de conexão",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-[#0a0a0a] p-6">
        <h2 className="mb-4 text-lg font-bold">Importar Guests (Luma CSV)</h2>
        
        <p className="mb-4 text-sm text-gray-400">
          Faça upload do CSV exportado do Luma. O sistema vai importar os guests
          com status "approved" e extrair nome e email automaticamente.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Selecionar arquivo CSV do Luma
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white file:mr-4 file:rounded file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-purple-700"
            />
          </div>

          {csvContent && (
            <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
              <p className="text-sm text-gray-400">
                Arquivo carregado: {csvContent.split("\n").length - 1} linhas de dados
              </p>
            </div>
          )}

          {result && (
            <div
              className={`rounded-lg border p-4 ${
                result.success
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              <p className="font-medium">{result.message}</p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto text-xs">
                  {result.errors.slice(0, 20).map((err, i) => (
                    <p key={i} className="text-gray-400">{err}</p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-gray-500 mt-1">... e mais {result.errors.length - 20} avisos</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-700 py-3 hover:bg-gray-800 disabled:opacity-50"
          >
            {result?.success ? "Fechar" : "Cancelar"}
          </button>
          {!result?.success && (
            <button
              onClick={handleSubmit}
              disabled={loading || !csvContent.trim()}
              className="flex-1 rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Importando..." : "Importar Guests"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
