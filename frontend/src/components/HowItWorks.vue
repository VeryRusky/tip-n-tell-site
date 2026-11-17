<script setup>
import { site } from '@/config/site'
</script>

<template>
  <ol class="how-steps">
    <li>
      <strong>Pick an open time</strong>
      <span>Open days and times are shown on a calendar.</span>
    </li>
    <li>
      <strong>Choose your service and design</strong>
      <span>Pick from my designs, or bring your own.</span>
    </li>
    <li>
      <strong>Send me the request on Instagram</strong>
      <span>
        Copy the ready-made message and send it to me on Instagram (@{{ site.instagramHandle }}).
        Your slot is booked once I reply to confirm.
      </span>
    </li>
  </ol>
</template>

<style scoped>
.how-steps {
  list-style: none;
  counter-reset: how;
  margin: 0;
  padding: 0;
}

.how-steps li {
  counter-increment: how;
  position: relative;
  padding: 0 0 1rem 3rem;
  min-height: 2.5rem;
}

.how-steps li:last-child {
  padding-bottom: 0;
}

/* Numbered circles drawn with CSS counters. */
.how-steps li::before {
  content: counter(how);
  position: absolute;
  left: 0;
  top: 0;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tt-white);
  border: 1.5px solid var(--tt-deep-rose);
  color: var(--tt-deep-rose);
  font-weight: 700;
  font-family: var(--tt-font-heading);
}

.how-steps strong,
.how-steps span {
  display: block;
}

.how-steps span {
  color: var(--tt-muted);
  font-size: 0.95rem;
}
</style>
