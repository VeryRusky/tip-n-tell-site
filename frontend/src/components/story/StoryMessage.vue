<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { site } from '@/config/site'
import { useCatalogStore } from '@/stores/catalog'
import { buildRequestMessage } from '@/utils/message'
import { phase, easeOut, setVars } from '@/utils/motion'
import IconHeart from '@/components/icons/IconHeart.vue'
import StoryScene from './StoryScene.vue'
import StoryFit from './StoryFit.vue'

// Scene 03, "Send it". A small Instagram-style chat:
//   0.05 – 0.45  the request types itself into a bubble (the real message format,
//                with the sample slot from scene 02 and sample choices)
//   0.47 – 0.52  it shows as sent
//   0.55 – 0.62  "typing…" dots
//   0.62 – 0.7   her reply pops in: "Booked ✓ See you then!"
//   0.74 – 0.92  a ribbon bow ties itself above the "Book a slot" button
const props = defineProps({
  animated: { type: Boolean, default: false },
  sampleSlot: { type: Object, default: null },
})
const emit = defineEmits(['progress'])

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
let lastProgress = 1

// The typed part of the message is written straight into the page (textContent),
// so typing a letter does not make Vue re-render the scene.
function showTyped(p) {
  if (!typed.value) return
  const letters = Math.round(phase(p, 0.05, 0.45) * message.value.length)
  const text = props.animated ? message.value.slice(0, letters) : message.value
  if (typed.value.textContent !== text) typed.value.textContent = text
}

function onProgress(p) {
  emit('progress', p)
  lastProgress = p
  showTyped(p)
  const typing = phase(p, 0.05, 0.45)
  setVars(visual.value, {
    // The caret shows only while typing.
    '--caret': typing > 0 && typing < 1 ? 1 : 0,
    '--sent': easeOut(phase(p, 0.47, 0.52)),
    // The dots fade in, then out as the reply arrives.
    '--dots': Math.min(phase(p, 0.55, 0.58), 1 - phase(p, 0.61, 0.63)),
    '--reply': phase(p, 0.62, 0.7),
    '--loops': phase(p, 0.74, 0.84),
    '--knot': phase(p, 0.82, 0.87),
    '--tails': phase(p, 0.85, 0.92),
  })
  // The underline under "once I reply" draws as her reply arrives.
  setVars(replyLine.value, { '--underline': easeOut(phase(p, 0.66, 0.74)) })
}

// The message arrives after the catalog loads; show the right amount of it then.
watch(message, () => showTyped(lastProgress), { flush: 'post' })
</script>

<template>
  <StoryScene
    number="03"
    title="Send it"
    title-id="story-send-title"
    :animated="animated"
    @progress="onProgress"
  >
    <template #text>
      <p>Send your request on Instagram.</p>
      <p ref="replyLine" class="reply-line" :class="{ 'is-animated': animated }">
        Your slot is booked <span class="underline">once I reply.</span>
      </p>
      <p v-if="message" class="visually-hidden">
        The picture shows a chat on Instagram. The request reads: “{{ message }}” My reply reads:
        “Booked. See you then!”
      </p>
    </template>

    <template #visual>
      <div ref="visual" class="send-visual" :class="{ 'is-animated': animated }">
        <!-- A soft glow behind the chat, like the one behind the hand in scene 01. -->
        <div class="glow" aria-hidden="true"></div>
        <StoryFit :active="animated" class="chat-fit">
          <div class="chat" aria-hidden="true">
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
        </StoryFit>

        <!-- The end of the story: a bow that ties itself above the real button. -->
        <div class="finale">
          <svg class="bow" viewBox="0 0 120 72" aria-hidden="true" focusable="false">
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
          <RouterLink :to="{ name: 'book-slot' }" class="btn btn-primary btn-lg finale-button">
            Book a slot
          </RouterLink>
        </div>
      </div>
    </template>
  </StoryScene>
</template>

<style scoped>
.glow {
  position: absolute;
  inset: -6% -15%;
  background: radial-gradient(closest-side, rgba(251, 219, 223, 0.9), transparent);
  pointer-events: none;
}

.chat-fit,
.finale {
  position: relative; /* above the glow */
}

.send-visual {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.chat-fit {
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

/* ---- Finale: bow and button ---- */
.finale {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 24rem;
  margin-top: 0.25rem;
}

.bow {
  width: 5.5rem;
  height: auto;
  overflow: visible;
  margin-bottom: -0.6rem;
  position: relative;
  z-index: 1;
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

.finale-button {
  width: 100%;
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
.is-animated .chat,
.is-animated .finale {
  will-change: transform;
}

/* Pinned on a phone: the chat takes the free space, the finale sits under it. */
.send-visual.is-animated {
  height: 100%;
}

/* The chat keeps its own height, but may shrink (and StoryFit then scales it down)
   when a short screen has less room. */
.send-visual.is-animated .chat-fit {
  flex: 0 1 auto;
  height: auto;
  min-height: 0;
}

.is-animated .finale {
  flex: 0 0 auto;
}

@media (max-height: 700px) and (max-width: 991.98px) {
  .is-animated .bow {
    width: 4rem;
  }
}

/* Laptops: about a quarter larger, so the picture holds its half of the screen. */
@media (min-width: 992px) {
  .chat,
  .finale {
    max-width: 33rem;
  }

  .chat {
    border-radius: 1.9rem;
  }

  .chat-top {
    padding: 0.9rem 1.25rem;
  }

  .avatar {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.15rem;
  }

  .handle {
    font-size: 1.1rem;
  }

  .chat-body {
    padding: 1.25rem 1.15rem 1.4rem;
    gap: 0.45rem;
  }

  .bubble {
    font-size: 1.15rem;
    padding: 0.75rem 1.05rem;
  }

  .sent-label {
    font-size: 0.85rem;
  }

  .bow {
    width: 6.5rem;
  }
}
</style>
