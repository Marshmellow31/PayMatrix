import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  BedDouble,
  CarFront,
  Check,
  QrCode,
  UtensilsCrossed,
} from 'lucide-react';
import PublicHeader from '../components/public/PublicHeader.jsx';
import PublicFooter from '../components/public/PublicFooter.jsx';
import './LandingPage.css';

const expenses = [
  { person: 'Aanya', item: 'The stay', amount: '₹3,600', icon: BedDouble, share: '60%' },
  { person: 'Kabir', item: 'Dinner', amount: '₹1,800', icon: UtensilsCrossed, share: '30%' },
  { person: 'Riya', item: 'The cab', amount: '₹600', icon: CarFront, share: '10%' },
];

const LandingPage = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (['#how-it-works', '#fair-splits', '#settle-up'].includes(hash)) {
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    }
  }, [hash]);

  return (
    <div className="landing">
      <a className="landing-skip" href="#main-content">
        Skip to content
      </a>

      <PublicHeader />

      <main id="main-content">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div
            className="landing-hero-photo"
            role="img"
            aria-label="Three friends talking around a cafe table after a meal"
          />
          <div className="landing-hero-shade" />
          <div className="landing-container landing-hero-inner">
            <div className="landing-hero-copy">
              <p className="landing-kicker">For the people you do life with</p>
              <h1 id="landing-title">
                Enjoy the plans.
                <br />
                <em>Skip the money confusion.</em>
              </h1>
              <p className="landing-hero-description">
                Track shared expenses, split them fairly, and see who owes whom—for trips,
                flatmates, and everyday plans.
              </p>
              <div className="landing-hero-actions">
                <Link className="landing-button" to="/register">
                  Get started <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a className="landing-text-link" href="#how-it-works">
                  See how it works <ArrowDownRight size={17} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
          <span className="landing-hero-caption">The good part is being together.</span>
        </section>

        <section
          className="landing-problem landing-section"
          id="how-it-works"
          aria-labelledby="problem-title"
        >
          <div className="landing-container landing-problem-grid">
            <div className="landing-problem-copy">
              <p className="landing-section-label">The familiar problem</p>
              <h2 id="problem-title">
                Everyone paid for something. <span>Now what?</span>
              </h2>
              <p>
                Aanya booked the stay. Kabir picked up dinner. Riya got the cab. By the end of the
                trip, the group chat has receipts but nobody has the full picture.
              </p>
            </div>
            <div className="landing-expenses" aria-label="Example expenses paid by three friends">
              <div className="landing-expenses-heading">
                <span className="landing-receipt-mark" aria-hidden="true">
                  ✳
                </span>
                <span>A weekend away</span>
                <span>3 friends · 3 expenses</span>
              </div>
              <div className="landing-expenses-body">
                {expenses.map((expense) => {
                  const Icon = expense.icon;
                  return (
                    <div className="landing-expense-row" key={expense.person}>
                      <span className="landing-expense-icon">
                        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className="landing-expense-detail">
                        <strong>{expense.item}</strong>
                        <small>Paid by {expense.person}</small>
                      </span>
                      <strong className="landing-expense-amount">{expense.amount}</strong>
                    </div>
                  );
                })}
              </div>
              <div className="landing-expenses-total">
                <span>
                  Spent together <small>One trip, three receipts</small>
                </span>
                <strong>₹6,000</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-answer landing-section" aria-labelledby="answer-title">
          <div className="landing-container">
            <div className="landing-answer-heading">
              <h2 id="answer-title">
                One group.
                <br />
                <span>One clear balance.</span>
              </h2>
              <p>
                Add what each person paid and choose how to split it. paymatrix keeps the record
                together and shows the amounts left to settle.
              </p>
            </div>
            <div className="landing-balance-layout">
              <div className="landing-share">
                <span className="landing-small-label">Weekend total</span>
                <div className="landing-share-top">
                  <div>
                    <strong>₹6,000</strong>
                    <span>Split equally between three friends</span>
                  </div>
                  <div className="landing-share-ring" aria-hidden="true">
                    <span>3</span>
                  </div>
                </div>
                <div
                  className="landing-contribution"
                  aria-label="Aanya paid 3600 rupees, Kabir paid 1800 rupees, Riya paid 600 rupees"
                >
                  {expenses.map((expense) => (
                    <div className="landing-contribution-row" key={expense.person}>
                      <span>{expense.person}</span>
                      <span className="landing-contribution-track">
                        <i style={{ width: expense.share }} />
                      </span>
                      <strong>{expense.amount}</strong>
                    </div>
                  ))}
                </div>
                <div className="landing-share-amount">
                  <span>Everyone’s share</span>
                  <strong>
                    ₹2,000 <small>each</small>
                  </strong>
                </div>
              </div>
              <div className="landing-outcome">
                <span className="landing-small-label">A clear way to settle</span>
                <div className="landing-receiver">
                  <span className="landing-avatar">A</span>
                  <div>
                    <strong>Aanya</strong>
                    <small>paid ₹1,600 above her share</small>
                  </div>
                  <span className="landing-receiver-total">+₹1,600</span>
                </div>
                <div className="landing-transfer">
                  <span className="landing-avatar">K</span>
                  <span className="landing-transfer-person">
                    Kabir <small>owes Aanya</small>
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                  <strong>₹200</strong>
                </div>
                <div className="landing-transfer">
                  <span className="landing-avatar">R</span>
                  <span className="landing-transfer-person">
                    Riya <small>owes Aanya</small>
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                  <strong>₹1,400</strong>
                </div>
                <p>Two clear amounts replace a weekend of figuring it out.</p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="landing-flexible landing-section"
          id="fair-splits"
          aria-labelledby="flexible-title"
        >
          <div className="landing-container landing-flexible-grid">
            <div>
              <h2 id="flexible-title">Real plans rarely split perfectly.</h2>
              <p>
                Some costs are shared by everyone. Others belong to just two people, or were covered
                by more than one friend. Record the arrangement you actually agreed on.
              </p>
              <Link className="landing-inline-link" to="/register">
                Start a group <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <div className="landing-split-list" aria-label="Ways to split an expense">
              <div>
                <span>01</span>
                <strong>Equal shares</strong>
                <p>Everyone involved pays the same part.</p>
                <div className="landing-split-graphic landing-split-equal" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div>
                <span>02</span>
                <strong>Exact amounts</strong>
                <p>Assign what each person really owes.</p>
                <div className="landing-split-graphic landing-split-exact" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div>
                <span>03</span>
                <strong>Multiple payers</strong>
                <p>Keep track when two people cover one expense.</p>
                <div className="landing-split-graphic landing-split-payers" aria-hidden="true">
                  <i />
                  <i />
                  <b />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="landing-settle landing-section"
          id="settle-up"
          aria-labelledby="settle-title"
        >
          <div className="landing-container landing-settle-grid">
            <div
              className="landing-settle-visual"
              aria-label="Example settlement from Riya to Aanya"
            >
              <span className="landing-small-label">The last step</span>
              <div className="landing-settle-people">
                <span>
                  <b className="landing-avatar">R</b>Riya
                </span>
                <span className="landing-settle-route">
                  <ArrowRight size={23} aria-hidden="true" />
                </span>
                <span>
                  <b className="landing-avatar">A</b>Aanya
                </span>
              </div>
              <strong>₹1,400</strong>
              <div className="landing-settle-state">
                <QrCode size={18} aria-hidden="true" /> Pay with a UPI QR{' '}
                <span aria-hidden="true">·</span> <Check size={16} aria-hidden="true" /> Confirm
                after payment
              </div>
            </div>
            <div className="landing-settle-copy">
              <h2 id="settle-title">Know what’s left to settle.</h2>
              <p>
                See the amount due and use a UPI QR to pay in your own app when it suits you. Record
                the settlement after the payment is confirmed.
              </p>
              <p className="landing-settle-note">
                paymatrix tracks the group’s record. It does not move money or verify that a
                transfer succeeded.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-cta landing-section" aria-labelledby="cta-title">
          <div className="landing-container landing-cta-inner">
            <div>
              <h2 id="cta-title">Make the next plan easier.</h2>
              <p>Less chasing. More knowing where everyone stands.</p>
            </div>
            <Link className="landing-button" to="/register">
              Get started <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};

export default LandingPage;
