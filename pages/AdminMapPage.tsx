import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// Middle East & Global regions data - spread out to avoid overlap
const REGIONS = [
  { id: "uae", name: "الإمارات", nameEn: "UAE", x: 72, y: 48, users: 0, sessions: 0 },
  { id: "saudi", name: "السعودية", nameEn: "Saudi Arabia", x: 58, y: 52, users: 0, sessions: 0 },
  { id: "egypt", name: "مصر", nameEn: "Egypt", x: 38, y: 38, users: 0, sessions: 0 },
  { id: "kuwait", name: "الكويت", nameEn: "Kuwait", x: 65, y: 35, users: 0, sessions: 0 },
  { id: "qatar", name: "قطر", nameEn: "Qatar", x: 70, y: 40, users: 0, sessions: 0 },
  { id: "jordan", name: "الأردن", nameEn: "Jordan", x: 45, y: 30, users: 0, sessions: 0 },
  { id: "lebanon", name: "لبنان", nameEn: "Lebanon", x: 42, y: 22, users: 0, sessions: 0 },
  { id: "iraq", name: "العراق", nameEn: "Iraq", x: 55, y: 28, users: 0, sessions: 0 },
  { id: "morocco", name: "المغرب", nameEn: "Morocco", x: 18, y: 35, users: 0, sessions: 0 },
  { id: "turkey", name: "تركيا", nameEn: "Turkey", x: 48, y: 15, users: 0, sessions: 0 },
  { id: "oman", name: "عُمان", nameEn: "Oman", x: 78, y: 55, users: 0, sessions: 0 },
  { id: "bahrain", name: "البحرين", nameEn: "Bahrain", x: 68, y: 42, users: 0, sessions: 0 },
];

// Launch checklist items in Arabic
const CHECKLIST_ITEMS = [
  { id: "1", text: "إعداد خوادم الترجمة الصوتية", completed: true, category: "تقني" },
  { id: "2", text: "اختبار جودة الصوت والترجمة", completed: true, category: "تقني" },
  { id: "3", text: "تفعيل نظام الاشتراكات والدفع", completed: false, category: "تقني" },
  { id: "4", text: "إعداد صفحات الهبوط للتسويق", completed: false, category: "تسويق" },
  { id: "5", text: "تجهيز محتوى السوشيال ميديا", completed: false, category: "تسويق" },
  { id: "6", text: "التواصل مع المؤثرين في المنطقة", completed: false, category: "تسويق" },
  { id: "7", text: "إعداد دعم العملاء بالعربية", completed: true, category: "دعم" },
  { id: "8", text: "تجهيز الأسئلة الشائعة FAQ", completed: false, category: "دعم" },
  { id: "9", text: "اختبار التطبيق مع مستخدمين حقيقيين", completed: false, category: "اختبار" },
  { id: "10", text: "مراجعة الأمان والخصوصية", completed: true, category: "تقني" },
  { id: "11", text: "إعداد التحليلات وتتبع المستخدمين", completed: false, category: "تقني" },
  { id: "12", text: "تحضير البيان الصحفي للإطلاق", completed: false, category: "تسويق" },
];

const AdminMapPage: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS);
  const [liveActivity, setLiveActivity] = useState<{ region: string; type: string }[]>([]);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeNow: 0,
    sessionsToday: 0,
    minutesTranslated: 0,
  });

  const [regionData, setRegionData] = useState(REGIONS);

  // Calculate checklist progress
  const completedTasks = checklist.filter((item) => item.completed).length;
  const totalTasks = checklist.length;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  // Toggle checklist item
  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  // Simulate real-time activity updates
  useEffect(() => {
    const interval = setInterval(() => {
      const randomRegion = REGIONS[Math.floor(Math.random() * REGIONS.length)];
      const types = ["signup", "session", "translation"];
      const randomType = types[Math.floor(Math.random() * types.length)];

      setLiveActivity((prev) => [
        { region: randomRegion.name, type: randomType },
        ...prev.slice(0, 9),
      ]);

      setRegionData((prev) =>
        prev.map((r) =>
          r.id === randomRegion.id
            ? {
                ...r,
                users: r.users + (randomType === "signup" ? 1 : 0),
                sessions: r.sessions + (randomType === "session" ? 1 : 0),
              }
            : r
        )
      );

      setStats((prev) => ({
        ...prev,
        totalUsers: prev.totalUsers + (randomType === "signup" ? 1 : 0),
        activeNow: Math.max(1, Math.floor(Math.random() * 15)),
        sessionsToday: prev.sessionsToday + (randomType === "session" ? 1 : 0),
        minutesTranslated: prev.minutesTranslated + Math.floor(Math.random() * 5),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getActivityColor = (type: string) => {
    switch (type) {
      case "signup":
        return "var(--matcha-500)";
      case "session":
        return "var(--terra-400)";
      case "translation":
        return "#6366f1";
      default:
        return "var(--text-muted)";
    }
  };

  const getActivityText = (type: string) => {
    switch (type) {
      case "signup":
        return "مستخدم جديد";
      case "session":
        return "جلسة جديدة";
      case "translation":
        return "ترجمة";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }} dir="rtl">
      <main className="relative z-10 px-6 pb-12 pt-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
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
                  خريطة الإطلاق
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
                خريطة النشاط العالمي
              </h1>
              <p style={{ color: "var(--text-secondary)" }}>
                متابعة النشاط المباشر في منطقة الشرق الأوسط وشمال أفريقيا
              </p>
            </div>

            {/* Live indicator */}
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "var(--bg-elevated)" }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "#22c55e" }}
              />
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                مباشر
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="matcha-card p-5">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                إجمالي المستخدمين
              </p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {stats.totalUsers.toLocaleString("ar-EG")}
              </p>
            </div>
            <div className="matcha-card p-5">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                نشط الآن
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold" style={{ color: "var(--matcha-600)" }}>
                  {stats.activeNow.toLocaleString("ar-EG")}
                </p>
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "var(--matcha-500)" }}
                />
              </div>
            </div>
            <div className="matcha-card p-5">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                جلسات اليوم
              </p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {stats.sessionsToday.toLocaleString("ar-EG")}
              </p>
            </div>
            <div className="matcha-card p-5">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                دقائق الترجمة
              </p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {stats.minutesTranslated.toLocaleString("ar-EG")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Map Section */}
            <div className="lg:col-span-2">
              <div className="matcha-card p-6 overflow-hidden">
                <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  منطقة الشرق الأوسط وشمال أفريقيا
                </h2>

                {/* SVG Map */}
                <div
                  className="relative w-full rounded-xl overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #1a1f2e 0%, #0f1419 100%)",
                    aspectRatio: "16/10",
                  }}
                >
                  {/* Grid overlay */}
                  <svg
                    className="absolute inset-0 w-full h-full opacity-10"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path
                          d="M 40 0 L 0 0 0 40"
                          fill="none"
                          stroke="var(--matcha-500)"
                          strokeWidth="0.5"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>

                  {/* Region points */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 70">
                    {/* Connection lines */}
                    {regionData.map((region, i) =>
                      regionData.slice(i + 1).map((other) => {
                        const distance = Math.sqrt(
                          Math.pow(region.x - other.x, 2) + Math.pow(region.y - other.y, 2)
                        );
                        if (distance < 20) {
                          return (
                            <line
                              key={`${region.id}-${other.id}`}
                              x1={region.x}
                              y1={region.y}
                              x2={other.x}
                              y2={other.y}
                              stroke="var(--matcha-500)"
                              strokeWidth="0.3"
                              opacity="0.3"
                            />
                          );
                        }
                        return null;
                      })
                    )}

                    {/* Region markers */}
                    {regionData.map((region) => {
                      const isSelected = selectedRegion === region.id;
                      const hasActivity = region.users > 0 || region.sessions > 0;

                      return (
                        <g
                          key={region.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedRegion(isSelected ? null : region.id)}
                        >
                          {/* Pulse ring for active regions */}
                          {hasActivity && (
                            <circle
                              cx={region.x}
                              cy={region.y}
                              r="4"
                              fill="none"
                              stroke="var(--matcha-400)"
                              strokeWidth="0.5"
                              opacity="0.6"
                            >
                              <animate
                                attributeName="r"
                                from="2"
                                to="6"
                                dur="1.5s"
                                repeatCount="indefinite"
                              />
                              <animate
                                attributeName="opacity"
                                from="0.6"
                                to="0"
                                dur="1.5s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          )}

                          {/* Glow effect */}
                          {(isSelected || hasActivity) && (
                            <circle
                              cx={region.x}
                              cy={region.y}
                              r="5"
                              fill={isSelected ? "var(--terra-400)" : "var(--matcha-400)"}
                              opacity="0.2"
                            />
                          )}

                          {/* Main dot */}
                          <circle
                            cx={region.x}
                            cy={region.y}
                            r={isSelected ? 3 : hasActivity ? 2.5 : 2}
                            fill={
                              isSelected
                                ? "var(--terra-400)"
                                : hasActivity
                                ? "var(--matcha-400)"
                                : "var(--matcha-600)"
                            }
                            className="transition-all"
                          />

                          {/* Label */}
                          <text
                            x={region.x}
                            y={region.y - 5}
                            textAnchor="middle"
                            fill="white"
                            fontSize="3"
                            fontWeight="600"
                            opacity={isSelected || hasActivity ? 1 : 0.7}
                            style={{ fontFamily: "system-ui, sans-serif" }}
                          >
                            {region.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Selected region info */}
                  {selectedRegion && (
                    <div
                      className="absolute bottom-4 right-4 p-4 rounded-xl"
                      style={{
                        background: "rgba(0, 0, 0, 0.85)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(104, 166, 125, 0.3)",
                      }}
                    >
                      <h3 className="text-white font-semibold mb-2 text-lg">
                        {regionData.find((r) => r.id === selectedRegion)?.name}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">المستخدمين</p>
                          <p className="text-white font-bold text-xl">
                            {(regionData.find((r) => r.id === selectedRegion)?.users || 0).toLocaleString("ar-EG")}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">الجلسات</p>
                          <p className="text-white font-bold text-xl">
                            {(regionData.find((r) => r.id === selectedRegion)?.sessions || 0).toLocaleString("ar-EG")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Region legend */}
                <div className="mt-4 flex flex-wrap gap-4">
                  {regionData
                    .filter((r) => r.users > 0 || r.sessions > 0)
                    .slice(0, 6)
                    .map((region) => (
                      <div
                        key={region.id}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedRegion(region.id)}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: "var(--matcha-500)" }}
                        />
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {region.name}: {region.users.toLocaleString("ar-EG")} مستخدم
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Checklist Section */}
              <div className="matcha-card p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    قائمة مهام الإطلاق
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {completedTasks} / {totalTasks}
                    </span>
                    <div
                      className="w-24 h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--bg-muted)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPercent}%`,
                          background: progressPercent === 100 ? "#22c55e" : "var(--matcha-500)",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                      style={{
                        background: item.completed ? "rgba(104, 166, 125, 0.1)" : "var(--bg-elevated)",
                        border: item.completed ? "1px solid rgba(104, 166, 125, 0.3)" : "1px solid transparent",
                      }}
                      onClick={() => toggleChecklistItem(item.id)}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: item.completed ? "var(--matcha-500)" : "transparent",
                          border: item.completed ? "none" : "2px solid var(--text-muted)",
                        }}
                      >
                        {item.completed && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 6L5 9L10 3"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        className="flex-1 text-sm"
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
            </div>

            {/* Right Sidebar */}
            <div>
              {/* Launch Countdown */}
              <div className="matcha-card p-6">
                <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  العد التنازلي للإطلاق
                </h2>
                <div
                  className="text-center py-8 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, var(--matcha-500), var(--matcha-600))",
                  }}
                >
                  <p className="text-6xl font-bold text-white mb-2">١٠</p>
                  <p className="text-white opacity-80 text-lg">أيام للإطلاق</p>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      الهدف: الشرق الأوسط
                    </span>
                    <span className="matcha-badge matcha-badge-success">جاهز</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      دعم اللغة العربية
                    </span>
                    <span className="matcha-badge matcha-badge-success">جاهز</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      تخطيط RTL
                    </span>
                    <span className="matcha-badge matcha-badge-success">جاهز</span>
                  </div>
                </div>
              </div>

              {/* Live Activity Feed */}
              <div className="matcha-card p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    النشاط المباشر
                  </h2>
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: "#22c55e" }}
                  />
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                  {liveActivity.length === 0 ? (
                    <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                      <p>في انتظار النشاط...</p>
                    </div>
                  ) : (
                    liveActivity.map((activity, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg"
                        style={{
                          background: "var(--bg-elevated)",
                          opacity: 1 - i * 0.08,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: getActivityColor(activity.type) }}
                          />
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {getActivityText(activity.type)}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {activity.region}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Progress Summary */}
              <div className="matcha-card p-6 mt-6">
                <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  ملخص التقدم
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>تقني</span>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {checklist.filter(c => c.category === "تقني" && c.completed).length}/
                        {checklist.filter(c => c.category === "تقني").length}
                      </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "var(--bg-muted)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(checklist.filter(c => c.category === "تقني" && c.completed).length / checklist.filter(c => c.category === "تقني").length) * 100}%`,
                          background: "var(--matcha-500)",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>تسويق</span>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {checklist.filter(c => c.category === "تسويق" && c.completed).length}/
                        {checklist.filter(c => c.category === "تسويق").length}
                      </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "var(--bg-muted)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(checklist.filter(c => c.category === "تسويق" && c.completed).length / checklist.filter(c => c.category === "تسويق").length) * 100}%`,
                          background: "var(--terra-400)",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>دعم</span>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {checklist.filter(c => c.category === "دعم" && c.completed).length}/
                        {checklist.filter(c => c.category === "دعم").length}
                      </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "var(--bg-muted)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(checklist.filter(c => c.category === "دعم" && c.completed).length / checklist.filter(c => c.category === "دعم").length) * 100}%`,
                          background: "#6366f1",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>اختبار</span>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {checklist.filter(c => c.category === "اختبار" && c.completed).length}/
                        {checklist.filter(c => c.category === "اختبار").length}
                      </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "var(--bg-muted)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(checklist.filter(c => c.category === "اختبار" && c.completed).length / checklist.filter(c => c.category === "اختبار").length) * 100}%`,
                          background: "#f59e0b",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminMapPage;
