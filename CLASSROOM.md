# Classroom Activity Ideas

This application was originally built as an instructional aid for multivariable calculus courses. While it can certainly be used simply to visualize vector fields, its real value comes from encouraging students to **predict**, **experiment**, **observe**, and **explain**. For this reason, students of all ages can participate and succeed in many of these activities well before they reach multivariable calculus.

Many of these activities intentionally ask students to develop geometric intuition *before* introducing the formal mathematics. Rather than beginning with symbolic manipulation and ending with a picture, these exercises begin with pictures and motion, allowing the algebraic ideas to emerge naturally.

---

## Flow Prediction

**Concepts:** Flow, deformation, local behavior

1. Pause the animation.
2. Choose a vector field.
3. Draw a recognizable shape (a letter, heart, wave, spiral, etc.).
4. Ask students:

   > *What will this shape look like after three seconds?*

5. Invite several students to sketch their predictions on the board using different marker colors. When possible, project the vector field directly onto a dry-erase board so students can draw on the plane itself.
6. Play the animation.
7. Pause after several seconds and compare the predictions with the actual result.

### Discussion

- Which features changed the most?
- Did the shape stretch, rotate, compress, or shear?
- Which parts stayed nearly unchanged?
- What clues in the vector field suggested this behavior?

---

## Follow a Particle

**Concepts:** Trajectories, integral curves

1. Clear the canvas.
2. Place a single point.
3. Ask students to sketch the path they expect it to follow.
4. Compare predictions in pairs.
5. Animate the point.

### Discussion

- Did the particle move where expected?
- Did its speed change?
- Why is the particle's path different from the direction of any single arrow?

---

## Paint with the Flow

**Concepts:** Continuous deformation

Because dragging the mouse continuously places points, the canvas can be used like a paintbrush.

Draw:

- letters
- simple drawings
- geometric figures
- coordinate axes

Then animate.

Students immediately see how regions deform under the vector field.

---

## Guess the Vector Field

Hide the vector arrows.

Leave only the points and coordinate axes visible.

Allow students to:

- populate the lattice with points
   - draw individual points
   - sketch shapes
- predict, play, observe, pause, reset, and repeat

Their challenge is to infer the underlying vector field before revealing it.

### Variation

Assign different groups responsibility for only one coordinate function.

For example:

- Group A determines the x-component.
- Group B determines the y-component.

This reinforces that a vector field is built from two independent coordinate functions working together.

---

## Vector Field Detective

Instead of identifying the exact function, ask students to classify properties of the field.

Examples:

- source
- sink
- saddle
- rotation
- shear
- translation

Require students to justify their answers before revealing the equation. What about the coordinate functions might indicate these behaviors?

---

## Transformation Challenge

This activity works especially well before introducing linear transformations.

Prepare:

- an initial drawing of points in the plane
- a target drawing elsewhere on the plane (in marker on the dry erase board so it stays fixed is ideal.)

Students may choose different vector fields and apply each one for arbitrary amounts of time.

Their objective is to transform the first picture into the second.

The emphasis is not finding *the* solution, but discovering that multiple sequences of transformations may work.

This naturally motivates:

- composition
- inverses
- order of operations
- linear transformations

before matrices ever appear.

---

## Activities Using Editable Functions

One of the application's most powerful features is that both components of every displayed vector field can be edited directly.

Clicking either displayed component converts it into an editable input. Press **Enter** (or click elsewhere) to immediately replot the field.

Rather than simply selecting examples, students can experiment with their own ideas.

---

### One Change at a Time

Begin with a simple field.

```text
⟨x, y⟩
```

Ask students to predict the effects of changing only one coordinate.

Examples:

```text
⟨2x, y⟩
⟨x, 2y⟩
⟨-x, y⟩
⟨x, -y⟩
```

Encourage students to isolate the effect of each modification before trying combinations.

---

### Predict the Edit

Show students a vector field.

Ask:

> What single edit would make the field rotate?

or

> What change would make particles move away from the origin more quickly?

Students propose edits before anyone types.

---

### Design a Vector Field

Give students a challenge instead of an equation.

Examples:

- Make particles spiral inward.
- Make everything move left.
- Make particles accelerate away from the origin.
- Make the x-axis remain fixed.
- Make points move only vertically.

Multiple correct answers are possible, encouraging creativity and discussion.

---

### Reverse Engineering

Hide the original function.

Students edit their own function until its behavior matches the hidden vector field as closely as possible.

---

### Tiny Changes, Big Differences

Challenge students to make the smallest possible symbolic edit that dramatically changes the behavior.

For example:

```text
⟨x, y⟩
```

becomes

```text
⟨x, -y⟩
```

or

```text
⟨y, x⟩
```

Discuss why such small algebraic changes can produce dramatically different geometric behavior.

---

## Analyze the Particle Grid

Reset the particles to the default grid and ask students to identify points that they predict will:

- travel in a circle
- move along a straight line through the origin
- remain fixed

Ask students to justify each prediction from the field's coordinate functions before playing the animation.

As a variation, challenge students to make a single algebraic edit—changing an operation or sign, for example—that produces a specified behavior such as making every nonzero particle move away from the origin.

---

## General Teaching Tips

- Pause frequently and ask students to predict before running the animation.
- Encourage students to justify *why* they expect a particular outcome.
- Let disagreements play out before revealing the answer.
- Ask students to describe behavior geometrically before introducing symbolic language.
- Encourage experimentation. There is often more than one correct answer.
- Most of these activities work best when the application is projected directly onto a writable surface such as a chalkboard or dry-erase board. Students can interact more closely with the field, and drawings on the board remain fixed while the application's particles move.

The application is designed to support inquiry rather than demonstration. Animations are useful, but students learn the most when they actively make and test hypotheses rather than simply watching.
