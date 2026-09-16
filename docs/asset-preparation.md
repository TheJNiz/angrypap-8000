# Asset preparation

The shipped assets are unchanged copies of the three user-supplied reference sheets in `public/assets/cartoon/`. Runtime texture regions and silhouette masks are defined in `src/artwork.js`.

The built-in imagegen tool was tried for transparent cutouts. Its results did not provide reliable transparency, so none of the generated images are used in the game. No CLI generation was used.

## Trial prompts (discarded outputs)

### sling

Use case: precise-object-edit. Edit target: supplied slingshot reference sheet. Create ONE production game sprite of the LARGE wooden slingshot on the LEFT, preserving its cartoon wood grain, thick dark outlines, red wraps at both fork tips, and leafy stone base. Remove the stretched elastic bands and leather pouch entirely so the space between and around the wooden branches is empty transparency; game code will animate bands and pouch. Preserve the full wooden Y fork and leafy base. Isolate ONLY this single object upright centered, filling about 90 percent of a portrait canvas. Actual transparent alpha background, no white background, no checkerboard baked in, no shadow outside the object, no text or other sheet elements. Faithfully retain original art style and silhouette.

### puff

Use case: background-extraction. Edit target: supplied curry puff character reference sheet. Extract ONE clean game sprite of the front-facing curry puff at the top row labeled FRONT. Preserve exactly its golden triangular pastry, braided crust, angry expressive eyes, open mouth, colors and cartoon shading. Single character upright centered on square canvas filling 90 percent with small transparent margin. Actual transparent alpha background. Remove all labels, other characters, floor shadow, speed streaks and background. No added elements or text. This is a projectile sprite for a game.

### cup

Use case: background-extraction. Edit target: supplied cartoon iced coffee cup reference sheet. Extract ONE clean game sprite of the large FRONT cup at top LEFT: foamy golden kopi, overflowing foam on left rim, ice cubes and green printed branding including face emblem. Preserve this illustration and printed cup artwork faithfully. One upright cup, complete visible foam and base, centered filling 90 percent of a portrait canvas. Actual transparent alpha background, remove colored backdrop, drop shadow, labels, all other sheet elements. Do not invent extra elements. No text outside the existing printed cup branding.

