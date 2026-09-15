import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Globe,
  HelpCircle,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react';
import { FaGithub } from 'react-icons/fa6';
import PublicHeader from '../components/public/PublicHeader.jsx';
import PublicFooter from '../components/public/PublicFooter.jsx';
import './LandingPage.css';
import './Contact.css';

const WEB3FORMS_ACCESS_KEY = '04005a18-f56a-4c5c-8a09-e5e0506cd979';

const INQUIRY_TYPES = [
  { id: 'user-support', label: 'App Issue & Support', icon: HelpCircle },
  { id: 'company-partner', label: 'Company & Partnership', icon: Briefcase },
  { id: 'sde-hiring', label: 'SDE Opportunity / Internship', icon: Sparkles },
  { id: 'feedback', label: 'Product Feedback', icon: MessageSquare },
];

const Contact = () => {
  useEffect(() => {
    document.title = 'Contact & Support — paymatrix';
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    inquiryType: 'user-support',
    subject: '',
    message: '',
    botcheck: false,
  });

  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleInquirySelect = (typeId) => {
    setFormData((prev) => ({
      ...prev,
      inquiryType: typeId,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.botcheck) return;

    setStatus('submitting');
    setErrorMessage('');

    const selectedType = INQUIRY_TYPES.find((t) => t.id === formData.inquiryType);
    const categoryLabel = selectedType ? selectedType.label : 'General Inquiry';
    const finalSubject = formData.subject.trim()
      ? `[paymatrix: ${categoryLabel}] ${formData.subject.trim()}`
      : `[paymatrix: ${categoryLabel}] New inquiry from ${formData.name}`;

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          name: formData.name,
          email: formData.email,
          company: formData.company || 'Not specified',
          inquiry_type: categoryLabel,
          subject: finalSubject,
          message: formData.message,
          from_name: 'paymatrix Contact Form',
        }),
      });

      const result = await response.json();
      if (result.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(result.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err.message || 'Network error. Please check your internet connection and try again.'
      );
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      company: '',
      inquiryType: 'user-support',
      subject: '',
      message: '',
      botcheck: false,
    });
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="landing contact-page">
      <a className="landing-skip" href="#contact-main">
        Skip to content
      </a>

      <PublicHeader />

      <main id="contact-main" className="contact-main">
        <div className="landing-container contact-container">
          {/* Header Intro */}
          <div className="contact-intro">
            <p className="landing-kicker">Contact &amp; Support</p>
            <h1>
              Let’s talk.
              <br />
              <em>Built for friends. Open for opportunities.</em>
            </h1>
            <p className="contact-description">
              Whether you encountered an issue in paymatrix, want to explore a company partnership,
              or want to connect about SDE roles and engineering projects, we’re here to help.
            </p>
          </div>

          <div className="contact-grid">
            {/* Left Column: Context & Creator Information */}
            <aside className="contact-info-panel" aria-label="About the app and creator">
              <div className="contact-card">
                <span className="contact-card-badge">About the Project</span>
                <h2>paymatrix</h2>
                <p>
                  A shared-expense platform designed for friends, roommates, and travel groups.
                  Built with exact paise arithmetic, deterministic remainder distribution, and
                  reliable group settlement workflows.
                </p>
              </div>

              <div className="contact-card">
                <span className="contact-card-badge">Behind the Code</span>
                <h2>Harshil Patel</h2>
                <p>
                  Computer Science &amp; Engineering undergraduate at <strong>IIIT Vadodara</strong>
                  . Passionate about crafting high-quality, resilient software across modern web
                  (React 19, Vite, Tailwind CSS) and native Android.
                </p>
                <p className="contact-card-subtext">
                  Actively exploring <strong>Software Development Engineer (SDE)</strong>{' '}
                  internships, technical collaborations, and product building.
                </p>

                <div className="contact-links-list">
                  <a
                    href="mailto:1080patelharshil@gmail.com"
                    className="contact-link-row"
                    aria-label="Email Harshil Patel"
                  >
                    <Mail size={17} aria-hidden="true" />
                    <span>1080patelharshil@gmail.com</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </a>
                  <a
                    href="https://www.harshilpatel.co.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-link-row"
                    aria-label="Harshil Patel Portfolio"
                  >
                    <Globe size={17} aria-hidden="true" />
                    <span>harshilpatel.co.in</span>
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                  <a
                    href="https://github.com/Marshmellow31"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-link-row"
                    aria-label="GitHub Profile"
                  >
                    <FaGithub size={17} aria-hidden="true" />
                    <span>github.com/Marshmellow31</span>
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="contact-status-card">
                <div className="contact-status-indicator" aria-hidden="true" />
                <div>
                  <strong>Fast response</strong>
                  <p>Inquiries are typically reviewed within 24 hours.</p>
                </div>
              </div>
            </aside>

            {/* Right Column: Web3Forms Contact Form */}
            <section className="contact-form-panel" aria-labelledby="form-heading">
              <div className="contact-form-card">
                {status === 'success' ? (
                  <div className="contact-success-state" role="status" aria-live="polite">
                    <CheckCircle2 size={52} className="contact-success-icon" aria-hidden="true" />
                    <h2>Message received!</h2>
                    <p>
                      Thank you for reaching out. Your note has been delivered directly to Harshil’s
                      inbox. We’ll get back to you shortly.
                    </p>
                    <button type="button" className="landing-button" onClick={handleReset}>
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="contact-form" noValidate>
                    <h2 id="form-heading">Send a message</h2>
                    <p className="contact-form-subtext">
                      Choose your topic below so your inquiry reaches the right focus.
                    </p>

                    {/* Anti-spam honeypot */}
                    <input
                      type="checkbox"
                      name="botcheck"
                      checked={formData.botcheck}
                      onChange={handleChange}
                      style={{ display: 'none' }}
                      tabIndex={-1}
                      autoComplete="off"
                    />

                    {/* Inquiry Type Chips */}
                    <div className="contact-type-selector">
                      <label className="contact-field-label">Topic / Purpose</label>
                      <div
                        className="contact-type-grid"
                        role="radiogroup"
                        aria-label="Inquiry Type"
                      >
                        {INQUIRY_TYPES.map((type) => {
                          const Icon = type.icon;
                          const isSelected = formData.inquiryType === type.id;
                          return (
                            <button
                              type="button"
                              key={type.id}
                              role="radio"
                              aria-checked={isSelected}
                              className={`contact-type-chip ${isSelected ? 'is-active' : ''}`}
                              onClick={() => handleInquirySelect(type.id)}
                            >
                              <Icon size={16} aria-hidden="true" />
                              <span>{type.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Name & Email Row */}
                    <div className="contact-fields-row">
                      <div className="contact-field-group">
                        <label htmlFor="contact-name" className="contact-field-label">
                          Your Name <span aria-hidden="true">*</span>
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="e.g. Harshil Patel"
                          className="contact-input"
                          autoComplete="name"
                        />
                      </div>

                      <div className="contact-field-group">
                        <label htmlFor="contact-email" className="contact-field-label">
                          Email Address <span aria-hidden="true">*</span>
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="you@company.com"
                          className="contact-input"
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    {/* Company / Affiliation (Optional) */}
                    <div className="contact-field-group">
                      <label htmlFor="contact-company" className="contact-field-label">
                        Company or Team <span className="contact-optional">(Optional)</span>
                      </label>
                      <input
                        id="contact-company"
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="e.g. Acme Corp or Flatmate group"
                        className="contact-input"
                        autoComplete="organization"
                      />
                    </div>

                    {/* Subject */}
                    <div className="contact-field-group">
                      <label htmlFor="contact-subject" className="contact-field-label">
                        Subject
                      </label>
                      <input
                        id="contact-subject"
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Brief summary of your inquiry"
                        className="contact-input"
                      />
                    </div>

                    {/* Message */}
                    <div className="contact-field-group">
                      <label htmlFor="contact-message" className="contact-field-label">
                        Message <span aria-hidden="true">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={
                          formData.inquiryType === 'company-partner'
                            ? 'Tell us about your organization and how we might collaborate...'
                            : formData.inquiryType === 'sde-hiring'
                              ? 'Tell us about the role, team, and opportunities at your organization...'
                              : formData.inquiryType === 'user-support'
                                ? 'Describe the issue you encountered, device details, or steps to reproduce...'
                                : 'Share your ideas or suggestions to make paymatrix even better...'
                        }
                        className="contact-textarea"
                      />
                    </div>

                    {/* Error Notice */}
                    {status === 'error' && (
                      <div className="contact-error-banner" role="alert">
                        <strong>Submission issue:</strong> {errorMessage}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="contact-form-actions">
                      <button
                        type="submit"
                        disabled={
                          status === 'submitting' ||
                          !formData.name ||
                          !formData.email ||
                          !formData.message
                        }
                        className="landing-button contact-submit-button"
                      >
                        {status === 'submitting' ? (
                          <>
                            <span className="contact-spinner" aria-hidden="true" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Send message <Send size={16} aria-hidden="true" />
                          </>
                        )}
                      </button>
                      <span className="contact-privacy-note">
                        Protected by Web3Forms. We never share your contact information.
                      </span>
                    </div>
                  </form>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Contact;
