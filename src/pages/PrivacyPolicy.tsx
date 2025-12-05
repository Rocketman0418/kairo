import { ArrowLeft } from 'lucide-react';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#0f1419]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <a
          href="/"
          className="inline-flex items-center text-[#06b6d4] hover:text-[#06b6d4]/80 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </a>

        <div className="bg-[#1a2332] border border-gray-800 rounded-lg p-8">
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last Updated: December 5, 2025</p>

          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">1. Introduction</h2>
              <p>
                Welcome to Kairo Pro ("we," "our," or "us"). We are committed to protecting your privacy and the privacy of your children. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered registration platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">2.1 Personal Information</h3>
              <p className="mb-2">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Parent/guardian name, email address, phone number, and address</li>
                <li>Child's name, date of birth, and other registration information</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Medical information you choose to provide for your child's safety</li>
                <li>Communication preferences and program selections</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">2.2 Automatically Collected Information</h3>
              <p className="mb-2">When you use our platform, we automatically collect:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Device information (browser type, operating system)</li>
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Conversation logs with our AI assistant (Kai)</li>
                <li>Voice recordings when you use voice input features (transcribed and encrypted)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">2.3 Children's Privacy (COPPA Compliance)</h3>
              <p>
                We are committed to complying with the Children's Online Privacy Protection Act (COPPA). We collect children's information only with verifiable parental consent. Parents can review, delete, or refuse further collection of their child's information at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
              <p className="mb-2">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Process and manage program registrations</li>
                <li>Facilitate communication between families and program organizers</li>
                <li>Process payments securely</li>
                <li>Provide AI-powered registration assistance through our chatbot</li>
                <li>Send registration confirmations, reminders, and updates</li>
                <li>Improve our platform and develop new features</li>
                <li>Comply with legal obligations and protect against fraud</li>
                <li>Respond to your questions and support requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">4. Information Sharing and Disclosure</h2>
              <p className="mb-2">We share your information only in the following circumstances:</p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">4.1 With Program Organizers</h3>
              <p>
                We share registration information with the youth sports or activity organizations you register with, including child information necessary for program participation.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">4.2 With Service Providers</h3>
              <p className="mb-2">We work with trusted third-party service providers:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Stripe for payment processing</li>
                <li>OpenAI/Anthropic for AI conversation services</li>
                <li>Supabase for secure data hosting</li>
                <li>Email and SMS service providers for communications</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">4.3 Legal Requirements</h3>
              <p>
                We may disclose information if required by law or in response to valid legal requests.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">4.4 Business Transfers</h3>
              <p>
                In the event of a merger, acquisition, or sale of assets, your information may be transferred with appropriate notice to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">5. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security audits and updates</li>
                <li>PCI DSS compliance for payment processing</li>
                <li>Encrypted storage of sensitive medical information</li>
              </ul>
              <p className="mt-2">
                However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">6. Your Rights and Choices</h2>
              <p className="mb-2">You have the following rights regarding your information:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your information (subject to legal obligations)</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Data Portability:</strong> Request your data in a portable format</li>
                <li><strong>Parental Rights:</strong> Review, modify, or delete your child's information</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, please contact us at privacy@kairopro.com
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">7. Voice Data</h2>
              <p>
                When you use voice input features, your voice is transcribed to text using secure speech-to-text services. Voice recordings are not permanently stored. Transcriptions are encrypted and used only to process your registration requests.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">8. Cookies and Tracking</h2>
              <p>
                We use essential cookies to maintain your session and remember your preferences. We do not use third-party advertising cookies. You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">9. Data Retention</h2>
              <p>
                We retain your information for as long as necessary to provide our services and comply with legal obligations. Registration and payment records are retained for 7 years for accounting and legal purposes. Conversation logs are retained for 90 days unless you request earlier deletion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">10. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on our platform and updating the "Last Updated" date. Your continued use after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">12. Contact Us</h2>
              <p className="mb-2">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-[#0f1419] border border-gray-700 rounded-lg p-4 mt-4">
                <p><strong className="text-white">Kairo Pro & RocketHub Labs</strong></p>
                <p>Email: privacy@kairopro.com</p>
                <p>Email: support@rockethublabs.com</p>
              </div>
            </section>

            <section className="border-t border-gray-700 pt-6 mt-8">
              <p className="text-sm text-gray-400">
                This Privacy Policy is designed to comply with COPPA, GDPR, CCPA, and other applicable privacy laws. We are committed to transparency and protecting the privacy of families using our platform.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
