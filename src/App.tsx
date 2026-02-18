import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import BabyProfile from "./pages/BabyProfile";
import AreaDetail from "./pages/AreaDetail";
import SkillDetail from "./pages/SkillDetail";
import History from "./pages/History";
import BabyForm from "./pages/BabyForm";
import AssessmentStart from "./pages/AssessmentStart";
import Assessment from "./pages/AssessmentNew";
import ProgressAssessmentStart from "./pages/ProgressAssessmentStart";
import ProgressAssessment from "./pages/ProgressAssessment";
import Report from "./pages/Report";
import Analytics from "./pages/Analytics";
import ResumeAssessment from "./pages/ResumeAssessment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Redirect helper for unlock-report to report
const UnlockReportRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/report/${id}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<BabyProfile />} />
          <Route path="/area/:areaId" element={<AreaDetail />} />
          <Route path="/skill/:skillId" element={<SkillDetail />} />
          <Route path="/history" element={<History />} />
          <Route path="/babies/new" element={<BabyForm />} />
          <Route path="/assessment/start" element={<AssessmentStart />} />
          <Route path="/assessment/:id" element={<Assessment />} />
          <Route path="/progress-assessment/start" element={<ProgressAssessmentStart />} />
          <Route path="/progress-assessment/:id" element={<ProgressAssessment />} />
          <Route path="/unlock-report/:id" element={<UnlockReportRedirect />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/resume" element={<ResumeAssessment />} />
          <Route path="/analytics" element={<Analytics />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
