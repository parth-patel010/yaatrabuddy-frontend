import { useState } from "react";
import { Search, CheckCircle, Lock, Car, Shield, MessageCircle, CreditCard, XCircle, UserCheck, Globe, Smartphone, Users, HelpCircle, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { TealHeader } from "@/components/TealHeader";
import { useAuth } from "@/hooks/useAuth";

const faqSections = [
  {
    id: "most-asked",
    title: "Most Asked Questions",
    icon: HelpCircle,
    questions: [
      {
        q: "Do I need to upload my University ID to use YaatraBuddy?",
        a: "✔️ Yes. Uploading a valid University ID is mandatory to create an account. This helps us maintain a safe, verified student community."
      },
      {
        q: "Can I sign up without uploading my ID?",
        a: "❌ No. Accounts are only created after ID upload."
      },
      {
        q: "How long does verification take?",
        a: "⏳ Usually within 24 hours."
      },
      {
        q: "What can I do before my account is verified?",
        a: "You can:\n✔ View rides\n✔ Explore the platform\n\nYou cannot:\n❌ Post rides\n❌ Request to join rides"
      },
      {
        q: "What changes after I am verified?",
        a: "You can:\n✔ Post rides\n✔ Request to join rides\n✔ Chat after approval\n✔ See contact details (with consent)"
      }
    ]
  },
  {
    id: "account-verification",
    title: "Account & Verification",
    icon: Lock,
    questions: [
      {
        q: "What happens if my ID is rejected?",
        a: "You will receive a notification with the reason and can upload again."
      },
      {
        q: "Who can see my uploaded ID?",
        a: "Only the YaatraBuddy team for verification. It is never visible to other users."
      },
      {
        q: "Is my data safe?",
        a: "Yes. All user data is securely stored and never shared or sold."
      }
    ]
  },
  {
    id: "rides-travel",
    title: "Rides & Travel",
    icon: Car,
    questions: [
      {
        q: "What kind of rides are allowed?",
        a: "Taxi, Auto, Cab & Car travel."
      },
      {
        q: "Can I find travel partners for long-distance trips?",
        a: "Yes. Both short and long-distance rides are supported."
      },
      {
        q: "How do I request to join a ride?",
        a: "Click 'Request to Join' and wait for the ride creator's approval."
      },
      {
        q: "Can a ride creator decline my request?",
        a: "Yes. They may approve or decline. You will be notified in both cases."
      }
    ]
  },
  {
    id: "safety-privacy",
    title: "Safety & Privacy",
    icon: Shield,
    questions: [
      {
        q: "Can anyone see my phone number?",
        a: "Only when:\n✔ Your request is accepted\n✔ And you give consent\n\nYour privacy is always protected."
      },
      {
        q: "How does YaatraBuddy keep users safe?",
        a: "✔ University-verified users only\n✔ Admin approval system\n✔ Consent-based contact sharing\n✔ Report & block options\n✔ Secure identity storage"
      },
      {
        q: "Are profiles publicly visible?",
        a: "No. Only logged-in users can view profiles."
      },
      {
        q: "Are profile photos always visible?",
        a: "No. Profile photos remain blurred until ride approval."
      }
    ]
  },
  {
    id: "notifications",
    title: "Notifications & Communication",
    icon: MessageCircle,
    questions: [
      {
        q: "How will I know if my request is approved?",
        a: "You'll receive:\n🔔 In-app notification\n📩 Status update"
      },
      {
        q: "Can I contact a user before approval?",
        a: "No. Contact details are shared only after approval."
      }
    ]
  },
  {
    id: "payments",
    title: "Payments & Pricing",
    icon: CreditCard,
    questions: [
      {
        q: "Does YaatraBuddy charge users?",
        a: "Currently, no platform fee is charged for students."
      },
      {
        q: "Do payments happen through YaatraBuddy?",
        a: "No. Payments (if any) happen directly between users."
      }
    ]
  },
  {
    id: "cancellations",
    title: "Cancellations & Reporting",
    icon: XCircle,
    questions: [
      {
        q: "What if someone cancels last-minute?",
        a: "We recommend early communication and updating ride status. Admins may intervene in repeated misuse cases."
      },
      {
        q: "Can I report a user?",
        a: "Yes. Use the 'Report User' option."
      },
      {
        q: "Can users be banned?",
        a: "Yes — for fake identity, harassment, spam, or policy violations."
      }
    ]
  },
  {
    id: "admin-verification",
    title: "Admin & Verification",
    icon: UserCheck,
    questions: [
      {
        q: "Who verifies users?",
        a: "The YaatraBuddy Team."
      },
      {
        q: "What is the verified badge?",
        a: "A blue ✔ badge indicating the user's identity is confirmed."
      }
    ]
  },
  {
    id: "availability",
    title: "Availability",
    icon: Globe,
    questions: [
      {
        q: "Who can use YaatraBuddy?",
        a: "Currently, university & college students only."
      },
      {
        q: "What locations are supported?",
        a: "All Indian cities (ride availability depends on users)."
      }
    ]
  },
  {
    id: "technical",
    title: "Technical & Access",
    icon: Smartphone,
    questions: [
      {
        q: "Do I need an app to use YaatraBuddy?",
        a: "You can use the web MVP for now. Mobile app is coming soon 📲"
      },
      {
        q: "What if I forget my password?",
        a: "Use 'Forgot Password' to reset it."
      }
    ]
  },
  {
    id: "community",
    title: "Community Rules",
    icon: Users,
    questions: [
      {
        q: "What are users expected to follow?",
        a: "✔ Respectful behaviour\n✔ Honest travel details\n✔ No spam or fake profiles\n✔ Be on time\n✔ Safety first"
      }
    ]
  },
  {
    id: "about",
    title: "About YaatraBuddy",
    icon: HelpCircle,
    questions: [
      {
        q: "What is YaatraBuddy?",
        a: "A verified travel-partner platform for students to share rides safely and affordably."
      },
      {
        q: "Why only students?",
        a: "Students often travel alone — we built a trusted, verified network just for them."
      },
      {
        q: "Is YaatraBuddy a ride-booking platform?",
        a: "No. We connect travellers — we don't operate vehicles."
      }
    ]
  },
  {
    id: "support",
    title: "Support",
    icon: Mail,
    questions: [
      {
        q: "How can I contact support?",
        a: "📧 support@yaatrabuddy.com"
      },
      {
        q: "How fast does support reply?",
        a: "Usually within 24 hours."
      }
    ]
  }
];

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  const filteredSections = faqSections.map(section => ({
    ...section,
    questions: section.questions.filter(
      q => 
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.questions.length > 0);

  return (
    <AppShell hideTopBar shellClassName="bg-deep-teal">
      <div className="relative w-full max-w-[390px] mx-auto h-full flex flex-col text-cream font-poppins antialiased overflow-hidden">
        <TealHeader title="YaatraBuddy" />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3 pb-24">
        {/* Hero Section */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-cream/80 text-sm">
            Everything you need to know about YaatraBuddy
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cream/60" />
          <Input
            type="text"
            placeholder="Search a question..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-11 text-sm bg-dark-teal border-white/10 text-cream placeholder:text-cream/50"
          />
        </div>

        {/* FAQ Sections */}
        <div className="space-y-4">
          {filteredSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <div key={section.id} className="bg-dark-teal rounded-xl border border-white/5 overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-white/5 border-b border-white/10">
                  <div className="p-2 rounded-lg bg-copper/20">
                    <IconComponent className="h-5 w-5 text-copper" />
                  </div>
                  <h2 className="font-semibold text-sm text-white">{section.title}</h2>
                </div>
                <Accordion type="single" collapsible className="px-3">
                  {section.questions.map((faq, idx) => (
                    <AccordionItem key={idx} value={`${section.id}-${idx}`} className="border-white/10">
                      <AccordionTrigger className="text-left hover:no-underline py-3 text-cream text-sm">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-cream/80 text-xs pb-3 whitespace-pre-line">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredSections.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-cream/40 mx-auto mb-4" />
            <p className="text-cream/80 text-sm">No questions found matching "{searchQuery}"</p>
            <Button 
              variant="link" 
              onClick={() => setSearchQuery("")}
              className="mt-2 text-copper hover:text-copper-light"
            >
              Clear search
            </Button>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-8 text-center bg-dark-teal rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-2">
            Still have questions?
          </h3>
          <p className="text-cream/80 text-sm mb-4">
            Contact us — we're happy to help
          </p>
          <a href="mailto:support@yaatrabuddy.com">
            <Button className="gap-2 copper-gradient text-white border-0 hover:opacity-90">
              <Mail className="h-4 w-4" />
              support@yaatrabuddy.com
            </Button>
          </a>
        </div>

        <footer className="py-6 text-center text-cream/60 text-xs">
          © {new Date().getFullYear()} YaatraBuddy. All rights reserved.
        </footer>
        </main>
      </div>
    </AppShell>
  );
};

export default FAQ;
