import React, { useState } from "react";
import { Link } from "react-router-dom";

// Launch checklist items in Arabic - organized by phase
const CHECKLIST_ITEMS = [
  // Phase 1: Technical Setup
  { id: "1", text: "إعداد خوادم الترجمة الصوتية", completed: true, category: "تقني", phase: 1 },
  { id: "2", text: "اختبار جودة الصوت والترجمة", completed: true, category: "تقني", phase: 1 },
  { id: "3", text: "مراجعة الأمان والخصوصية", completed: true, category: "تقني", phase: 1 },
  { id: "4", text: "تفعيل نظام الاشتراكات والدفع", completed: false, category: "تقني", phase: 1 },
  { id: "5", text: "إعداد التحليلات وتتبع المستخدمين", completed: false, category: "تقني", phase: 1 },

  // Phase 2: Content & Marketing
  { id: "6", text: "إعداد صفحات الهبوط للتسويق", completed: false, category: "تسويق", phase: 2 },
  { id: "7", text: "تجهيز محتوى السوشيال ميديا", completed: false, category: "تسويق", phase: 2 },
  { id: "8", text: "التواصل مع المؤثرين في المنطقة", completed: false, category: "تسويق", phase: 2 },
  { id: "9", text: "تحضير البيان الصحفي للإطلاق", completed: false, category: "تسويق", phase: 2 },

  // Phase 3: Support & Testing
  { id: "10", text: "إعداد دعم العملاء بالعربية", completed: true, category: "دعم", phase: 3 },
  { id: "11", text: "تجهيز الأسئلة الشائعة FAQ", completed: false, category: "دعم", phase: 3 },
  { id: "12", text: "اختبار التطبيق مع مستخدمين حقيقيين", completed: false, category: "اختبار", phase: 3 },
];

const PHASES = [
  { id: 1, name: "المرحلة الأولى", title: "الإعداد التقني", color: "var(--matcha-500)" },
  { id: 2, name: "المرحلة الثانية", title: "التسويق والمحتوى", color: "var(--terra-400)" },
  { id: 3, name: "المرحلة الثالثة", title: "الدعم والاختبار", color: "#6366f1" },
];

const AdminMapPage: React.FC = () => {
  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS);

  // Calculate progress
  const completedTasks = checklist.filter((item) => item.completed).length;
  const totalTasks = checklist.length;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  // Toggle checklist item
  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  // Get phase progress
  const getPhaseProgress = (phaseId: number) => {
    const phaseTasks = checklist.filter((t) => t.phase === phaseId);
    const completed = phaseTasks.filter((t) => t.completed).length;
    return { completed, total: phaseTasks.length, percent: Math.round((completed / phaseTasks.length) * 100) };
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }} dir="rtl">
      <main className="relative z-10 px-6 pb-12 pt-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Link
                to="/"
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: "var(--text-muted)" }}
              >
                الرئيسية
              </Link>
              <span style={{ color: "var(--text-muted)" }}>/</span>
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                خطة الإطلاق
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              خارطة طريق الإطلاق
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              متابعة تقدم المهام والاستعداد لإطلاق TRAVoices في الشرق الأوسط
            </p>
          </div>

          {/* Overall Progress Card */}
          <div className="matcha-card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  التقدم الإجمالي
                </h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {completedTasks} من {totalTasks} مهمة مكتملة
                </p>
              </div>
              <div
                className="text-4xl font-bold"
                style={{ color: progressPercent === 100 ? "#22c55e" : "var(--matcha-600)" }}
              >
                {progressPercent}%
              </div>
            </div>
            <div
              className="w-full h-4 rounded-full overflow-hidden"
              style={{ background: "var(--bg-muted)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: progressPercent === 100
                    ? "linear-gradient(90deg, #22c55e, #16a34a)"
                    : "linear-gradient(90deg, var(--matcha-400), var(--matcha-600))",
                }}
              />
            </div>
          </div>

          {/* Phase Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {PHASES.map((phase) => {
              const progress = getPhaseProgress(phase.id);
              return (
                <div key={phase.id} className="matcha-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: phase.color }}
                    />
                    <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                      {phase.name}
                    </span>
                  </div>
                  <h3 className="font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    {phase.title}
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {progress.completed}/{progress.total}
                    </span>
                    <span className="text-sm font-bold" style={{ color: phase.color }}>
                      {progress.percent}%
                    </span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-muted)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress.percent}%`, background: phase.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Phases with Tasks */}
          <div className="space-y-6">
            {PHASES.map((phase) => {
              const phaseTasks = checklist.filter((t) => t.phase === phase.id);
              const progress = getPhaseProgress(phase.id);
              const isComplete = progress.percent === 100;

              return (
                <div key={phase.id} className="matcha-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ background: phase.color }}
                      >
                        {phase.id}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {phase.title}
                        </h2>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {phase.name}
                        </p>
                      </div>
                    </div>
                    {isComplete ? (
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}
                      >
                        مكتمل
                      </span>
                    ) : (
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}
                      >
                        قيد التنفيذ
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {phaseTasks.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                        style={{
                          background: item.completed ? "rgba(104, 166, 125, 0.08)" : "var(--bg-elevated)",
                          border: item.completed ? "1px solid rgba(104, 166, 125, 0.2)" : "1px solid transparent",
                        }}
                        onClick={() => toggleChecklistItem(item.id)}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            background: item.completed ? "var(--matcha-500)" : "transparent",
                            border: item.completed ? "none" : "2px solid var(--text-muted)",
                          }}
                        >
                          {item.completed && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M2 7L5.5 10.5L12 3.5"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          className="flex-1"
                          style={{
                            color: item.completed ? "var(--text-muted)" : "var(--text-primary)",
                            textDecoration: item.completed ? "line-through" : "none",
                          }}
                        >
                          {item.text}
                        </span>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            background: "var(--bg-muted)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {item.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Launch Countdown */}
          <div className="matcha-card p-6 mt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                  العد التنازلي للإطلاق
                </h2>
                <p style={{ color: "var(--text-secondary)" }}>
                  الهدف: إطلاق TRAVoices في منطقة الشرق الأوسط وشمال أفريقيا
                </p>
              </div>
              <div
                className="text-center px-8 py-6 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, var(--matcha-500), var(--matcha-600))",
                }}
              >
                <p className="text-5xl font-bold text-white mb-1">١٠</p>
                <p className="text-white opacity-80">أيام متبقية</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminMapPage;
