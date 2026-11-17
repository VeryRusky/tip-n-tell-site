<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { site } from '@/config/site'
import { useCatalogStore } from '@/stores/catalog'
import { buildRequestMessage } from '@/utils/message'
import { phase, easeOut, setVars } from '@/utils/motion'
import IconHeart from '@/components/icons/IconHeart.vue'
import StoryFit from './StoryFit.vue'

// Story scene 3, "Send it". A small Instagram-style chat. The story player calls
// `update(t)` with t going from 0 to 1 over about four and a half seconds:
//   0.04 – 0.36  the request types itself into a bubble (the real message format,
//                with the sample slot from scene 2 and sample choices)
//   0.37 – 0.41  it shows as sent
//   0.43 – 0.5   "typing…" dots
//   0.5  – 0.57  her reply pops in: "Booked ✓ See you then!"
//   0.6  – 0.78  a ribbon bow ties itself under the chat, then the finished picture holds
const props = defineProps({
  animated: { type: Boolean, default: false },
  sampleSlot: { type: Object, default: null },
})

const catalog = useCatalogStore()
onMounted(() => catalog.load())

// Sample choices: extensions and #3 Cherry bows, no add-on.
const message = computed(() => {
  if (!props.sampleSlot) return ''
  const service = catalog.services.find((s) => s.id === 'extensions') ?? catalog.services[0]
  const design = catalog.designs.find((d) => d.id === 3) ?? catalog.designs[0]
  if (!service || !design) return ''
  const estimate = service.price + (props.sampleSlot.special ? catalog.specialSlotFee : 0)
  return buildRequestMessage({
    slot: props.sampleSlot,
    service,
    design,
    ownDesign: false,
    addOns: [],
    estimate,
  })
})

const visual = ref(null)
const replyLine = ref(null)
const typed = ref(null)
let lastTime = 1

// The typed part of the message is written straight into the page (textContent),
// so typing a letter does not make Vue re-render the scene.
function showTyped(t) {
  if (!typed.value) return
  const letters = Math.round(phase(t, 0.04, 0.36) * message.value.length)
  const text = props.animated ? message.value.slice(0, letters) : message.value
  if (typed.value.textContent !== text) typed.value.textContent = text
}

// Draws the scene at time t (0 to 1).
function update(t) {
  lastTime = t
  showTyped(t)
  const typing = phase(t, 0.04, 0.36)
  setVars(visual.value, {
    // The caret shows only while typing.
    '--caret': typing > 0 && typing < 1 ? 1 : 0,
    '--sent': easeOut(phase(t, 0.37, 0.41)),
    // The dots fade in, then out as the reply arrives.
    '--dots': Math.min(phase(t, 0.43, 0.46), 1 - phase(t, 0.48, 0.5)),
    '--reply': phase(t, 0.5, 0.57),
    '--loops': phase(t, 0.6, 0.7),
    '--knot': phase(t, 0.68, 0.73),
    '--tails': phase(t, 0.71, 0.78),
  })
  // The underline under "once I reply" draws as her reply arrives.
  setVars(replyLine.value, { '--underline': easeOut(phase(t, 0.54, 0.62)) })
}

defineExpose({ update })

// The message arrives after the catalog loads; show the right amount of it then.
watch(message, () => showTyped(lastTime), { flush: 'post' })
onMounted(() => showTyped(lastTime))
</script>

<template>
  <div class="card-scene">
    <div class="card-text">
      <h3 id="story-send-title">Send it</h3>
      <p>Send your request on Instagram.</p>
      <p ref="replyLine" class="reply-line" :class="{ 'is-animated': animated }">
        Your slot is booked <span class="underline">once I reply.</span>
      </p>
      <p v-if="message" class="visually-hidden">
        The picture shows a chat on Instagram. The request reads: “{{ message }}” My reply reads:
        “Booked. See you then!”
      </p>
    </div>

    <div
      ref="visual"
      class="card-picture send-visual"
      :class="{ 'is-animated': animated }"
      aria-hidden="true"
    >
      <!-- A soft glow behind the chat, like the one behind the hand in scene 1. -->
      <div class="glow"></div>
      <StoryFit active :max-scale="1.35" class="chat-fit">
        <!-- The chat and its bow are one picture, scaled together and kept centred. -->
        <div class="chat-group">
          <div class="chat">
            <div class="chat-top">
              <span class="avatar"><IconHeart /></span>
              <span class="handle">{{ site.instagramHandle }}</span>
            </div>

            <div class="chat-body">
              <div class="bubble bubble-out">
                <span class="bubble-fill"></span>
                <!-- The full text, invisible, keeps the bubble its final size while typing. -->
                <span class="bubble-size">{{ message }}</span>
                <!-- Filled in by showTyped(), never by Vue, so the two never fight over it. -->
                <span class="bubble-text"
                  ><span ref="typed"></span><span class="caret"></span
                ></span>
              </div>
              <p class="sent-label">Sent</p>

              <div class="typing-dots"><span></span><span></span><span></span></div>
              <div class="bubble bubble-in">Booked ✓ See you then!</div>
            </div>
          </div>
          <!-- The end of the story: a ribbon bow that ties itself. -->
          <svg class="bow" viewBox="0 0 120 72" focusable="false">
            <path class="bow-loop" pathLength="1" d="M60 30 C48 14 22 4 14 14 C6 24 24 40 60 30" />
            <path
              class="bow-loop"
              pathLength="1"
              d="M60 30 C72 14 98 4 106 14 C114 24 96 40 60 30"
            />
            <path class="bow-tail" pathLength="1" d="M56 34 C52 46 46 56 38 68" />
            <path class="bow-tail" pathLength="1" d="M64 34 C68 46 74 56 82 68" />
            <ellipse class="bow-knot" cx="60" cy="31" rx="6.5" ry="7" />
          </svg>
        </div>
      </StoryFit>
    </div>
  </div>
</template>

<style scoped>
.glow {
  position: absolute;
  inset: -6% -15%;
  background: radial-gradient(closest-side, rgba(251, 219, 223, 0.9), transparent);
  pointer-events: none;
}

/* A size container, so the chat window can grow taller when the card is tall
   (cqh = 1% of this box's height), like a real chat screen with the messages at the bottom. */
.send-visual {
  container-type: size;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.chat-fit {
  position: relative; /* above the glow */
  width: 100%;
}

.chat {
  width: 100%;
  max-width: 24rem;
  margin: 0 auto;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: 1.6rem;
  overflow: hidden;
  box-shadow: 0 18px 40px -24px rgba(158, 74, 85, 0.45);
}

.chat-top {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--tt-line);
  background: var(--tt-cream);
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--tt-pink);
  border: 1px solid var(--tt-line);
  color: var(--tt-deep-rose);
}

.handle {
  font-weight: 700;
  font-size: 0.95rem;
}

.chat-body {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: clamp(0px, 50cqh, 22rem);
  padding: 1rem 0.9rem 1.1rem;
  gap: 0.35rem;
}

.bubble {
  position: relative;
  max-width: 85%;
  padding: 0.6rem 0.85rem;
  border-radius: 1.2rem;
  font-size: 0.95rem;
  line-height: 1.4;
}

.bubble-out {
  align-self: flex-end;
  border-bottom-right-radius: 0.35rem;
  border: 1.5px dashed var(--tt-line);
  display: grid;
}

/* The pink of a sent message, faded in over the draft. */
.bubble-fill {
  position: absolute;
  inset: -1.5px;
  border-radius: inherit;
  background: var(--tt-pink);
  border: 1.5px solid var(--tt-line);
}

/* Size holder and typed text share one grid cell, so they sit exactly on top of each other. */
.bubble-size,
.bubble-text {
  grid-area: 1 / 1;
  position: relative;
}

.bubble-size {
  visibility: hidden;
}

.caret {
  display: inline-block;
  width: 2px;
  height: 1.05em;
  margin-left: 1px;
  vertical-align: text-bottom;
  background: var(--tt-deep-rose);
  opacity: 0;
}

.sent-label {
  align-self: flex-end;
  margin: 0 0.25rem 0.4rem 0;
  font-size: 0.75rem;
  color: var(--tt-muted);
}

.typing-dots {
  display: none;
}

.bubble-in {
  align-self: flex-start;
  background: var(--tt-blush);
  border: 1px solid var(--tt-line);
  border-bottom-left-radius: 0.35rem;
  font-weight: 700;
  transform-origin: left bottom;
}

.reply-line .underline {
  background: linear-gradient(var(--tt-rose), var(--tt-rose)) no-repeat left bottom / 100% 2px;
  padding-bottom: 1px;
}

/* ---- The bow ---- */
.chat-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 24rem;
  margin: 0 auto;
}

.bow {
  flex: 0 0 auto;
  margin-top: 0.5rem;
  width: 4.5rem;
  height: auto;
  overflow: visible;
  position: relative;
}

.bow-loop,
.bow-tail {
  fill: none;
  stroke: var(--tt-deep-rose);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.bow-loop {
  fill: var(--tt-pink);
}

.bow-knot {
  fill: var(--tt-rose);
  stroke: var(--tt-deep-rose);
  stroke-width: 2;
  transform-box: fill-box;
  transform-origin: center;
}

/* ---- Scrubbed ---- */
.is-animated .bubble-fill {
  opacity: var(--sent);
}

.is-animated .bubble-out {
  transform: translateY(calc(var(--sent) * -0.15rem));
}

.is-animated .caret {
  opacity: var(--caret);
}

.is-animated .sent-label {
  opacity: var(--sent);
}

.is-animated .typing-dots {
  display: flex;
  gap: 4px;
  align-self: flex-start;
  height: 0;
  padding-left: 0.9rem;
  opacity: var(--dots);
  transform: translateY(0.4rem);
}

.is-animated .typing-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tt-rose);
}

/* Pops in from its corner with a small overshoot. */
.is-animated .bubble-in {
  opacity: min(1, calc(var(--reply) * 3));
  transform: scale(calc(0.5 + var(--reply) * 0.5 + sin(var(--reply) * 180deg) * 0.08));
}

.reply-line.is-animated .underline {
  background-size: calc(var(--underline) * 100%) 2px;
}

/* (Round line ends would leave a dot before a line starts, so lines also fade in quickly.) */
.is-animated .bow-loop {
  opacity: min(1, var(--loops) * 20);
  stroke-dasharray: 1 1;
  stroke-dashoffset: calc(1 - var(--loops));
  fill-opacity: var(--loops);
}

.is-animated .bow-knot {
  opacity: var(--knot);
  transform: scale(calc(var(--knot) + sin(var(--knot) * 180deg) * 0.25));
}

.is-animated .bow-tail {
  opacity: min(1, var(--tails) * 20);
  stroke-dasharray: 1 1;
  stroke-dashoffset: calc(1 - var(--tails));
}

/* Own compositor layers: typing and pops never repaint the big glow behind the chat. */
.is-animated .glow,
.is-animated .chat {
  will-change: transform;
}

/* The chat keeps its own height, but may shrink (and StoryFit then scales it down)
   when the card has less room. */
/* The chat takes the free height above the bow; StoryFit then scales it to fit that space
   (down in a small card, up to 1.35x in a tall one). */
.send-visual.card-picture .chat-fit {
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}
</style>
