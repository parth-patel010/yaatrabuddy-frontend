import { AppShell } from "@/components/AppShell";
import { TealHeader } from "@/components/TealHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Mail, 
  Instagram, 
  Linkedin, 
  Shield, 
  Clock, 
  Users, 
  GraduationCap,
  AlertTriangle,
  HelpCircle,
  UserCheck,
  Lightbulb,
  Handshake,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";

const contactMethods = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    detail: "+91 7482010707",
    purpose: "Quick help & urgent issues",
    buttonText: "Chat with Support",
    action: () => window.open("https://wa.me/917482010707", "_blank"),
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "hover:border-green-300 dark:hover:border-green-700",
    trustText: "Average response: under 2 hours",
  },
  {
    icon: Mail,
    title: "Email Support",
    detail: "support@yaatrabuddy.com",
    purpose: "Official support & reports",
    buttonText: "Contact Support Team",
    action: () => window.open("mailto:support@yaatrabuddy.com", "_blank"),
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "hover:border-blue-300 dark:hover:border-blue-700",
    trustText: "Response within 24 hours",
  },
  {
    icon: Instagram,
    title: "Instagram",
    detail: "@yaatrabuddy.in",
    purpose: "Updates, stories & community",
    buttonText: "Follow Our Journey",
    action: () => window.open("https://www.instagram.com/yaatrabuddy.in?igsh=YWF6MWEyam05cWd3", "_blank"),
    color: "text-pink-600",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
    borderColor: "hover:border-pink-300 dark:hover:border-pink-700",
    trustText: "Verified YaatraBuddy channel",
  },
  {
    icon: Linkedin,
    title: "LinkedIn",
    detail: "YaatraBuddy",
    purpose: "Professional & partnerships",
    buttonText: "Connect Professionally",
    action: () => window.open("https://www.linkedin.com/company/yaatrabuddy", "_blank"),
    color: "text-blue-700",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "hover:border-blue-400 dark:hover:border-blue-600",
    trustText: "Official company page",
  },
];

const whyReachOut = [
  {
    icon: Shield,
    title: "Safety First",
    description: "We actively review reports and protect our users.",
  },
  {
    icon: Users,
    title: "Real Humans",
    description: "Every message is handled by a real support team member.",
  },
  {
    icon: GraduationCap,
    title: "Student-Friendly Support",
    description: "Built for students, by people who understand student travel.",
  },
];

const contactReasons = [
  { icon: AlertTriangle, text: "Reporting a user or safety issue" },
  { icon: HelpCircle, text: "Ride-related problems" },
  { icon: UserCheck, text: "Account or profile verification" },
  { icon: Lightbulb, text: "Feedback & feature suggestions" },
  { icon: Handshake, text: "Partnerships & campus collaborations" },
];

const Contact = () => {
  return (
    <AppShell hideTopBar shellClassName="bg-deep-teal">
      <div className="relative w-full max-w-[390px] mx-auto h-full flex flex-col font-poppins antialiased overflow-hidden bg-deep-teal">
        <TealHeader title="YaatraBuddy" />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-cream text-foreground rounded-t-2xl px-4 pt-6 pb-24">
          {/* Hero */}
          <section className="text-center pb-6">
            <h1 className="text-2xl font-bold text-deep-teal mb-2">Contact Us</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Have a question, feedback, or safety concern? The YaatraBuddy team is here to help.
            </p>
          </section>

          {/* Contact Methods - single column, consistent cards */}
          <section className="space-y-4 pb-8">
            {contactMethods.map((method) => (
              <Card
                key={method.title}
                className={`group border-2 rounded-2xl overflow-hidden ${method.borderColor}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-3 shrink-0 ${method.bgColor}`}>
                      <method.icon className={`h-6 w-6 ${method.color}`} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="font-semibold text-base text-foreground">{method.title}</h3>
                      <p className="text-muted-foreground text-sm">{method.detail}</p>
                      <p className="text-xs text-muted-foreground/80 uppercase tracking-wide">{method.purpose}</p>
                      <Button onClick={method.action} className="w-full mt-2" size="sm">
                        {method.buttonText}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground/60" />
                        <p className="text-xs text-muted-foreground/70">{method.trustText}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Why Reach Out */}
          <section className="bg-dark-teal/10 rounded-2xl p-5 mb-6 text-deep-teal">
            <h2 className="text-lg font-bold text-center mb-6">Why reach out to YaatraBuddy?</h2>
            <div className="space-y-5">
              {whyReachOut.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <div className="rounded-xl bg-deep-teal/20 p-2.5 shrink-0">
                    <item.icon className="h-5 w-5 text-deep-teal" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Common Reasons */}
          <section className="mb-6">
            <h2 className="text-lg font-bold text-center text-foreground mb-4">You can contact us for:</h2>
            <Card className="rounded-2xl border-border">
              <CardContent className="p-4">
                <ul className="space-y-3">
                  {contactReasons.map((reason, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2">
                        <reason.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{reason.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Footer note */}
          <Card className="rounded-2xl border-border bg-muted/30">
            <CardContent className="p-5 text-center">
              <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                <span className="font-semibold text-foreground">YaatraBuddy</span> is a student-first ride-sharing platform focused on safety, trust, and verified travel companions.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <Link to="/faq" className="text-primary hover:underline font-medium">FAQ</Link>
                <span className="text-muted-foreground">·</span>
                <Link to="/faq" className="text-primary hover:underline font-medium">Safety</Link>
                <span className="text-muted-foreground">·</span>
                <Link to="/contact" className="text-primary hover:underline font-medium">Contact</Link>
              </div>
            </CardContent>
          </Card>

          <footer className="pt-6 text-center text-muted-foreground text-xs">
            © {new Date().getFullYear()} YaatraBuddy. All rights reserved.
          </footer>
        </main>
      </div>
    </AppShell>
  );
};

export default Contact;
