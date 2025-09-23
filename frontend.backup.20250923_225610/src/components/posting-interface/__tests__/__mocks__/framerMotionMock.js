/**
 * Framer Motion Mock
 * Simplifies motion components for testing
 */

const React = require('react');

const createMotionComponent = (component) => {
  return React.forwardRef(({ children, ...props }, ref) => {
    // Remove motion-specific props to avoid React warnings
    const {
      initial,
      animate,
      exit,
      variants,
      transition,
      whileHover,
      whileTap,
      whileFocus,
      whileInView,
      drag,
      dragConstraints,
      dragElastic,
      dragMomentum,
      dragTransition,
      layout,
      layoutId,
      ...restProps
    } = props;

    return React.createElement(component, { ref, ...restProps }, children);
  });
};

const motion = {
  div: createMotionComponent('div'),
  span: createMotionComponent('span'),
  p: createMotionComponent('p'),
  h1: createMotionComponent('h1'),
  h2: createMotionComponent('h2'),
  h3: createMotionComponent('h3'),
  h4: createMotionComponent('h4'),
  h5: createMotionComponent('h5'),
  h6: createMotionComponent('h6'),
  button: createMotionComponent('button'),
  a: createMotionComponent('a'),
  img: createMotionComponent('img'),
  form: createMotionComponent('form'),
  input: createMotionComponent('input'),
  textarea: createMotionComponent('textarea'),
  select: createMotionComponent('select'),
  ul: createMotionComponent('ul'),
  ol: createMotionComponent('ol'),
  li: createMotionComponent('li'),
  nav: createMotionComponent('nav'),
  header: createMotionComponent('header'),
  footer: createMotionComponent('footer'),
  section: createMotionComponent('section'),
  article: createMotionComponent('article'),
  aside: createMotionComponent('aside'),
  main: createMotionComponent('main'),
  svg: createMotionComponent('svg'),
  path: createMotionComponent('path'),
  circle: createMotionComponent('circle'),
  rect: createMotionComponent('rect'),
  line: createMotionComponent('line'),
  g: createMotionComponent('g')
};

const AnimatePresence = ({ children, mode, initial, onExitComplete, ...props }) => {
  return React.createElement(React.Fragment, null, children);
};

const MotionConfig = ({ children, ...props }) => {
  return React.createElement(React.Fragment, null, children);
};

const LazyMotion = ({ children, features, strict, ...props }) => {
  return React.createElement(React.Fragment, null, children);
};

// Mock hooks
const useAnimation = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  set: jest.fn(),
  mount: jest.fn(),
  unmount: jest.fn()
});

const useAnimationControls = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  set: jest.fn(),
  mount: jest.fn(),
  unmount: jest.fn()
});

const useMotionValue = (initial) => ({
  get: jest.fn(() => initial),
  set: jest.fn(),
  on: jest.fn(() => jest.fn()),
  onChange: jest.fn(() => jest.fn()),
  stop: jest.fn(),
  destroy: jest.fn()
});

const useTransform = (value, input, output, options) => ({
  get: jest.fn(() => output ? output[0] : 0),
  set: jest.fn(),
  on: jest.fn(() => jest.fn()),
  onChange: jest.fn(() => jest.fn()),
  stop: jest.fn(),
  destroy: jest.fn()
});

const useSpring = (source, config) => ({
  get: jest.fn(() => typeof source === 'object' ? source.get() : source),
  set: jest.fn(),
  on: jest.fn(() => jest.fn()),
  onChange: jest.fn(() => jest.fn()),
  stop: jest.fn(),
  destroy: jest.fn()
});

const useScroll = () => ({
  scrollX: { get: jest.fn(() => 0) },
  scrollY: { get: jest.fn(() => 0) },
  scrollXProgress: { get: jest.fn(() => 0) },
  scrollYProgress: { get: jest.fn(() => 0) }
});

const useViewportScroll = () => useScroll();

const useElementScroll = () => useScroll();

const useInView = () => true;

const usePresence = () => [true, jest.fn()];

const useDragControls = () => ({
  start: jest.fn(),
  componentControls: new Set()
});

const useCycle = (...items) => [items[0], jest.fn()];

const useReducedMotion = () => false;

const useMotionTemplate = (template, ...values) => template;

const useTime = () => ({ get: jest.fn(() => 0) });

const useVelocity = (value) => ({ get: jest.fn(() => 0) });

const useWillChange = () => jest.fn();

// Mock utilities
const transform = jest.fn((value, input, output) => output[0]);

const animate = jest.fn(() => ({
  stop: jest.fn(),
  then: jest.fn(cb => cb && cb()),
  catch: jest.fn(),
  finally: jest.fn()
}));

const animateValue = jest.fn();

const stagger = jest.fn((value, options) => value);

const delay = jest.fn((value) => value);

const spring = jest.fn((options) => options);

const easeIn = 'easeIn';
const easeOut = 'easeOut';
const easeInOut = 'easeInOut';
const linear = 'linear';

const cubicBezier = jest.fn((x1, y1, x2, y2) => `cubic-bezier(${x1},${y1},${x2},${y2})`);

const steps = jest.fn((count, direction) => `steps(${count}, ${direction})`);

// Export everything
module.exports = {
  motion,
  AnimatePresence,
  MotionConfig,
  LazyMotion,
  useAnimation,
  useAnimationControls,
  useMotionValue,
  useTransform,
  useSpring,
  useScroll,
  useViewportScroll,
  useElementScroll,
  useInView,
  usePresence,
  useDragControls,
  useCycle,
  useReducedMotion,
  useMotionTemplate,
  useTime,
  useVelocity,
  useWillChange,
  transform,
  animate,
  animateValue,
  stagger,
  delay,
  spring,
  easeIn,
  easeOut,
  easeInOut,
  linear,
  cubicBezier,
  steps,

  // Exports for commonjs compatibility
  __esModule: true,
  default: { motion, AnimatePresence }
};