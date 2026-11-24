<script setup>
import StudioIcon from './StudioIcon.vue'

const copyrightYears = new Date().getFullYear()
const socialLinks = [
  { name: 'LinkedIn', icon: 'linkedin', url: 'https://nimakarimi.me/linkedin' },
  { name: 'YouTube', icon: 'youtube', url: 'https://nimakarimi.me/youtube' },
  { name: 'GitHub', icon: 'github', url: 'https://nimakarimi.me/github' },
]
</script>

<template>
  <footer class="footer">
    <div class="footer-intro">
      <span class="script footer-brand">Salsa &amp; Bachata</span>
      <p class="copyright">
        © {{ copyrightYears }} <a href="https://nimakarimi.me" target="_blank" rel="noopener noreferrer">Nima
          Karimi</a>
      </p>
    </div>
    <div class="footer-connect">
      <nav class="social-links" aria-label="Segui Nima Karimi">
        <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank"
          rel="noopener noreferrer">
          <StudioIcon :name="social.icon" /><span>{{ social.name }}</span>
        </a>
      </nav>
      <p class="footer-contact">Per richieste e domande, scrivi a
        <a href="mailto:dance@nimakarimi.me">dance@nimakarimi.me</a>
      </p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  gap: 1.5rem;
  margin-top: 2.5rem;
  border-top: 1px solid var(--line);
  background: var(--ink-2);
  padding: 2rem clamp(1rem, 4vw, 3rem) calc(var(--nav-h) + 2rem + env(safe-area-inset-bottom));
  text-align: left;
  font-size: 1rem;
  color: var(--muted);
}

.footer a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.5rem;
  color: var(--text);
  text-underline-offset: 4px;
}

.footer-brand {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
}

.footer-intro p {
  margin: 0.25rem 0 0;
}

.footer-intro,
.footer-connect {
  min-width: 0;
}

.social-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.social-links a {
  text-decoration: none;
  padding-inline: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
}

.social-links a:hover {
  background: var(--ink-3);
  color: var(--brand-text);
}

.footer-contact {
  margin: 0.75rem 0 0;
}

.footer-contact a {
  padding-inline: 0;
  overflow-wrap: anywhere;
}

.copyright {
  margin: 0;
  font-size: 0.875rem;
}

@media (min-width: 960px) {
  .footer {
    padding-bottom: 2rem;
  }
}

@media (min-width: 640px) {
  .footer {
    flex-direction: row;
    align-items: flex-start;
  }

  .footer-connect {
    text-align: right;
    max-width: 34rem;
  }

  .social-links {
    justify-content: flex-end;
  }
}
</style>
