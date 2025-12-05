import { ArrowLeft } from 'lucide-react';

export function TermsConditions() {
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
          <h1 className="text-4xl font-bold text-white mb-4">Terms & Conditions</h1>
          <p className="text-gray-400 mb-8">Last Updated: December 5, 2025</p>

          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                Welcome to Kairo Pro, operated by Kairo Pro & RocketHub Labs ("Company," "we," "our," or "us"). By accessing or using our AI-powered registration platform, mobile applications, and related services (collectively, the "Services"), you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree to these Terms, please do not use our Services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">2. Description of Services</h2>
              <p>
                Kairo Pro provides an AI-powered conversational platform that enables families to register for youth sports programs, activities, and classes. Our Services include:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>AI-powered registration assistant (Kai)</li>
                <li>Voice and text-based registration interfaces</li>
                <li>Program search and recommendations</li>
                <li>Payment processing and management</li>
                <li>Session scheduling and calendar management</li>
                <li>Communication between families and program organizers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">3. User Accounts and Registration</h2>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">3.1 Account Creation</h3>
              <p>
                To use our Services, you must create an account and provide accurate, complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">3.2 Age Requirements</h3>
              <p>
                You must be at least 18 years old to create an account. Our Services are designed for parents/guardians registering minors for youth programs. We collect children's information only with verifiable parental consent in compliance with COPPA.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">3.3 Account Security</h3>
              <p>
                You agree to immediately notify us of any unauthorized access or use of your account. We are not liable for losses caused by unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">4. Program Registration and Payments</h2>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">4.1 Registration Process</h3>
              <p>
                When you register for a program through our platform, you are entering into a direct agreement with the program organizer. Kairo Pro facilitates the registration but is not responsible for program delivery, quality, or cancellation.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">4.2 Payment Terms</h3>
              <p className="mb-2">
                Payments are processed securely through Stripe. By providing payment information, you:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Authorize us to charge the specified amount for program registration</li>
                <li>Represent that you have the legal right to use the payment method</li>
                <li>Agree to pay all applicable fees and taxes</li>
                <li>Accept that payment plans may include installment fees</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">4.3 Refunds and Cancellations</h3>
              <p>
                Refund policies are determined by individual program organizers. Kairo Pro does not control or guarantee refunds. Platform service fees are non-refundable. Please review the specific program's cancellation policy before registering.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">4.4 Pricing and Availability</h3>
              <p>
                Program prices and availability are subject to change. We display real-time availability but cannot guarantee spots due to concurrent registrations. If a session becomes full during your registration, we will offer alternative options.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">5. AI Services and Limitations</h2>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">5.1 AI Assistant</h3>
              <p>
                Our AI assistant (Kai) is designed to facilitate registration but may occasionally provide inaccurate information. You should verify important details before completing registration.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">5.2 Voice Services</h3>
              <p>
                Voice input features use speech-to-text technology. You are responsible for reviewing transcribed text for accuracy before submission. We are not liable for errors in voice transcription.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">5.3 Service Availability</h3>
              <p>
                While we strive for 99.9% uptime, AI services may occasionally be unavailable. We provide fallback registration forms when AI services are unavailable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">6. User Conduct and Prohibited Uses</h2>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Provide false, inaccurate, or misleading information</li>
                <li>Impersonate any person or entity</li>
                <li>Use the Services for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Services</li>
                <li>Use automated systems (bots) to access the Services without permission</li>
                <li>Reverse engineer or attempt to extract source code</li>
                <li>Share account credentials with others</li>
                <li>Use the Services to harm minors in any way</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">7. Intellectual Property</h2>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">7.1 Our Rights</h3>
              <p>
                The Services, including all content, features, and functionality, are owned by Kairo Pro & RocketHub Labs and are protected by copyright, trademark, and other intellectual property laws. "Kairo," "Kai," and associated logos are trademarks of our Company.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">7.2 Limited License</h3>
              <p>
                We grant you a limited, non-exclusive, non-transferable license to access and use the Services for personal, non-commercial purposes. This license does not include any right to resell, redistribute, or create derivative works.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">7.3 User Content</h3>
              <p>
                You retain ownership of information you provide through the Services. By using our Services, you grant us a license to use, store, and process your information as described in our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">8. Third-Party Services</h2>
              <p>
                Our Services integrate with third-party services (Stripe for payments, communication providers, etc.). Your use of these services is subject to their respective terms and conditions. We are not responsible for third-party services or their content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">9. Disclaimers and Limitation of Liability</h2>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">9.1 Service Disclaimer</h3>
              <p>
                THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">9.2 Program Disclaimer</h3>
              <p>
                WE ARE NOT RESPONSIBLE FOR THE QUALITY, SAFETY, OR DELIVERY OF PROGRAMS OFFERED BY THIRD-PARTY ORGANIZERS. WE DO NOT ENDORSE OR GUARANTEE ANY PROGRAM, COACH, OR FACILITY.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">9.3 Limitation of Liability</h3>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, KAIRO PRO & ROCKETHUB LABS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR GOODWILL.
              </p>
              <p className="mt-2">
                OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM YOUR USE OF THE SERVICES SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">10. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless Kairo Pro & RocketHub Labs, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, costs, or expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Your violation of these Terms</li>
                <li>Your use of the Services</li>
                <li>Your violation of any rights of another person or entity</li>
                <li>Information you provide through the Services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">11. Dispute Resolution</h2>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">11.1 Informal Resolution</h3>
              <p>
                Before filing a claim, you agree to contact us at support@kairopro.com to attempt to resolve the dispute informally. We will work in good faith to resolve disputes.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">11.2 Arbitration</h3>
              <p>
                Any dispute arising from these Terms or the Services shall be resolved through binding arbitration in accordance with the American Arbitration Association's rules, rather than in court. You waive your right to a jury trial.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">11.3 Class Action Waiver</h3>
              <p>
                You agree that disputes will be resolved on an individual basis and waive your right to participate in class action lawsuits or class-wide arbitration.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">12. Termination</h2>
              <p>
                We may suspend or terminate your account at any time for violation of these Terms or for any other reason. You may terminate your account at any time by contacting us. Upon termination, your right to use the Services ceases immediately.
              </p>
              <p className="mt-2">
                Provisions that should survive termination (including liability limitations, indemnification, and dispute resolution) will continue to apply.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">13. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms and updating the "Last Updated" date. Your continued use of the Services after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">14. Governing Law</h2>
              <p>
                These Terms are governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">15. Miscellaneous</h2>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">15.1 Entire Agreement</h3>
              <p>
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and Kairo Pro regarding the Services.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">15.2 Severability</h3>
              <p>
                If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full effect.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">15.3 Waiver</h3>
              <p>
                Our failure to enforce any provision of these Terms does not constitute a waiver of that provision.
              </p>

              <h3 className="text-xl font-semibold text-white mb-2 mt-4">15.4 Assignment</h3>
              <p>
                You may not assign or transfer these Terms or your account without our written consent. We may assign these Terms without restriction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">16. Contact Information</h2>
              <p className="mb-2">
                If you have questions about these Terms, please contact us:
              </p>
              <div className="bg-[#0f1419] border border-gray-700 rounded-lg p-4 mt-4">
                <p><strong className="text-white">Kairo Pro & RocketHub Labs</strong></p>
                <p>Email: legal@kairopro.com</p>
                <p>Email: support@rockethublabs.com</p>
              </div>
            </section>

            <section className="border-t border-gray-700 pt-6 mt-8">
              <p className="text-sm text-gray-400">
                By using Kairo Pro, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions. Thank you for choosing Kairo Pro for your family's registration needs.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
