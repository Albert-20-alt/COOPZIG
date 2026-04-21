import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import ProductsSection from "@/components/landing/ProductsSection";
import CalendarSection from "@/components/landing/CalendarSection";
import CooperativeSection from "@/components/landing/CooperativeSection";
import BlogPreviewSection from "@/components/landing/BlogPreviewSection";
import ProjectsPreviewSection from "@/components/landing/ProjectsPreviewSection";
import OrderSection from "@/components/landing/OrderSection";
import Footer from "@/components/landing/Footer";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <ProductsSection />
      <CalendarSection />
      <CooperativeSection />
      <BlogPreviewSection />
      <ProjectsPreviewSection />
      <OrderSection />
      <Footer />
    </div>
  );
};

export default LandingPage;
