import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Services from "./pages/Services";
import ProviderDetail from "./pages/ProviderDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Payment from "./pages/Payment";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminRoute from "./components/AdminRoute";
import WorkerDashboard from "./pages/WorkerDashboard";
import WorkerRoute from "./components/WorkerRoute";
import BookingConfirmed from "./pages/BookingConfirmed";
import MyRequests from "./pages/MyRequests";
import BookingDetail from "./pages/BookingDetail";
import Donations from "./pages/Donations";
import BiddingRequestDetail from "./pages/BiddingRequestDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/services" element={<Services />} />
            <Route path="/provider/:id" element={<ProviderDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/payment/:bookingId" element={<Payment />} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/worker" element={<WorkerRoute><WorkerDashboard /></WorkerRoute>} />
            <Route path="/booking-confirmed/:bookingId" element={<BookingConfirmed />} />
            <Route path="/my-requests" element={<MyRequests />} />
            <Route path="/booking/:bookingId" element={<BookingDetail />} />
            <Route path="/donations" element={<Donations />} />
            <Route path="/bidding/:requestId" element={<BiddingRequestDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

