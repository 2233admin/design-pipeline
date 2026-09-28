# SPDX-License-Identifier: MIT
# design-pipeline Blender template: product turntable.
# Run headless: blender -b --factory-startup -noaudio -P product-turntable.py -- <params.json> <out_dir>
# Builds the whole scene in code (no .blend), renders a PNG sequence, and writes:
#   probe.json  - keyframes per fcurve (seconds, interpolation) for the timeline gate
#   motion.json - camera and product transforms baked per frame, for three.js blocks
import bpy, json, math, os, sys

argv = sys.argv[sys.argv.index("--") + 1:]
params = json.load(open(argv[0], encoding="utf-8"))
out = argv[1]

def hex_rgb(value):
    value = value.lstrip("#")
    srgb = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1.0]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
fps = int(params["fps"])
frames = max(2, round(params["durationSec"] * fps))
scene.render.engine = params.get("engine", "BLENDER_EEVEE")
scene.render.resolution_x, scene.render.resolution_y = int(params["width"]), int(params["height"])
scene.render.fps, scene.render.fps_base = fps, 1.0
scene.frame_start, scene.frame_end = 1, frames
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(out, "frame_")
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
if scene.render.engine == "CYCLES":
    scene.cycles.samples = int(params["samples"])
    scene.cycles.seed = 7
    scene.cycles.use_animated_seed = False
else:
    try:
        scene.eevee.taa_render_samples = int(params["samples"])
    except AttributeError:
        pass

# ---- product ----
if params.get("model"):
    model = params["model"]
    ext = os.path.splitext(model)[1].lower()
    before = set(bpy.data.objects)
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=model)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=model)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=model)
    else:
        raise RuntimeError(f"unsupported model format {ext}; use .glb, .gltf, .obj or .fbx")
    parts = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    if not parts:
        raise RuntimeError("the model contains no mesh")
    bpy.ops.object.empty_add(location=(0, 0, 0))
    product = bpy.context.object
    for part in parts:
        if part.parent is None or part.parent not in parts:
            part.parent = product
    # normalize: fit the tallest dimension to 2 units and stand on the floor
    bpy.context.view_layer.update()
    corners = [part.matrix_world @ v.co for part in parts for v in part.data.vertices]
    lo = [min(c[i] for c in corners) for i in range(3)]
    hi = [max(c[i] for c in corners) for i in range(3)]
    size = max(hi[i] - lo[i] for i in range(3)) or 1
    scale = 2.0 / size
    product.scale = (scale, scale, scale)
    product.location = (-(lo[0] + hi[0]) / 2 * scale, -(lo[1] + hi[1]) / 2 * scale, -lo[2] * scale)
    use_material = False
else:
    shape = params["shape"]
    if shape == "cylinder":
        bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.55, depth=1.6, location=(0, 0, 0.8))
    elif shape == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=0.8, location=(0, 0, 0.8))
    else:
        dims = (0.7, 0.08, 1.45) if shape == "phone" else (0.9, 0.55, 1.6)
        # Stand on the floor: centre at half height (a phone leans back slightly, like on a stand).
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, dims[2] / 2))
        cube = bpy.context.object
        cube.scale = dims
        bpy.ops.object.transform_apply(scale=True)
        bevel = cube.modifiers.new("Bevel", "BEVEL")
        bevel.width, bevel.segments = (0.07 if shape == "phone" else 0.12), 8
    bpy.ops.object.shade_smooth()
    product = bpy.context.object
    use_material = True
product.name = "Product"

if use_material:
    body = bpy.data.materials.new("Body")
    body.use_nodes = True
    bsdf = body.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = hex_rgb(params["color"])
    bsdf.inputs["Roughness"].default_value = params["roughness"]
    bsdf.inputs["Metallic"].default_value = params["metallic"]
    try:
        bsdf.inputs["Coat Weight"].default_value = 0.35
        bsdf.inputs["Coat Roughness"].default_value = 0.08
    except KeyError:
        pass
    product.data.materials.append(body)

# ---- studio: curved backdrop (cyclorama) so there is no horizon line ----
bg = hex_rgb(params["background"])
# Floor from the front, then a quarter-circle sweep up into a back wall behind the product.
# Wide and tall enough that no orbit angle sees its edges (a visible edge leaks the set).
profile = [(-30, 0)] + [(3 + 2.5 * math.sin(a), 2.5 * (1 - math.cos(a))) for a in [i * math.pi / 2 / 16 for i in range(17)]] + [(5.5, 30)]
verts = []
for y, z in profile:
    verts += [(-40, y, z), (40, y, z)]
faces = [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(len(profile) - 1)]
mesh = bpy.data.meshes.new("Backdrop")
mesh.from_pydata(verts, [], faces)
mesh.update()
for polygon in mesh.polygons:
    polygon.use_smooth = True
cyc = bpy.data.objects.new("Backdrop", mesh)
scene.collection.objects.link(cyc)
backdrop = bpy.data.materials.new("Backdrop")
backdrop.use_nodes = True
backdrop.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = bg
backdrop.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.6
cyc.data.materials.append(backdrop)

# ---- light ----
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
background = world.node_tree.nodes["Background"]
hdri = params.get("hdriFile")
if hdri:
    # The HDRI lights and reflects; camera rays see the studio colour, so the environment never
    # shows past the backdrop.
    nodes, links = world.node_tree.nodes, world.node_tree.links
    env = nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(hdri)
    links.new(env.outputs["Color"], background.inputs["Color"])
    background.inputs["Strength"].default_value = 0.8
    plain = nodes.new("ShaderNodeBackground")
    plain.inputs["Color"].default_value = [c * 0.5 for c in bg[:3]] + [1]
    plain.inputs["Strength"].default_value = 1.0
    path_node = nodes.new("ShaderNodeLightPath")
    mix = nodes.new("ShaderNodeMixShader")
    links.new(path_node.outputs["Is Camera Ray"], mix.inputs["Fac"])
    links.new(background.outputs["Background"], mix.inputs[1])
    links.new(plain.outputs["Background"], mix.inputs[2])
    links.new(mix.outputs["Shader"], nodes["World Output"].inputs["Surface"])
else:
    background.inputs["Color"].default_value = [c * 0.5 for c in bg[:3]] + [1]
    background.inputs["Strength"].default_value = 0.3
for name, location, energy, size in (("Key", (3.0, -2.5, 5.5), 420, 3), ("Fill", (-4.5, -3.0, 2.5), 110, 6), ("Rim", (-1.5, 3.2, 3.8), 650, 1.5)):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy * (0.5 if hdri else 1.0)
    light.data.size = size
    target = bpy.data.objects.new(f"{name}Target", None)
    scene.collection.objects.link(target)
    target.location = (0, 0, 0.9)
    aim = light.constraints.new("TRACK_TO")
    aim.target, aim.track_axis, aim.up_axis = target, "TRACK_NEGATIVE_Z", "UP_Y"

# ---- camera and motion ----
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.name = "Camera"
camera.data.lens = 50
camera.data.dof.use_dof = True
camera.data.dof.focus_object = product
camera.data.dof.aperture_fstop = 4.0
scene.camera = camera
focus = bpy.data.objects.new("Focus", None)
scene.collection.objects.link(focus)
focus.location = (0, 0, 0.9)
aim = camera.constraints.new("TRACK_TO")
aim.target, aim.track_axis, aim.up_axis = focus, "TRACK_NEGATIVE_Z", "UP_Y"

last = frames
move = params["cameraMove"]
if move == "orbit":
    steps = 4
    for i in range(steps + 1):
        angle = math.radians(-90 + 60 * i / steps)
        camera.location = (6.2 * math.cos(angle), 6.2 * math.sin(angle), 1.6)
        camera.keyframe_insert("location", frame=1 + round((last - 1) * i / steps))
else:
    camera.location = (0, -6.8, 1.9)
    camera.keyframe_insert("location", frame=1)
    if move == "push":
        camera.location = (0, -4.6, 1.3)
        camera.keyframe_insert("location", frame=last)
# Turn into the hero pose: most of the turn happens before the product faces the camera, so the
# final frame is a flattering three-quarter view rather than an edge-on silhouette.
turn = math.radians(params["turnDegrees"])
product.rotation_euler = (0, 0, -0.75 * turn)
product.keyframe_insert("rotation_euler", frame=1)
product.rotation_euler = (0, 0, 0.25 * turn)
product.keyframe_insert("rotation_euler", frame=last)

def fcurves_of(obj):
    action = obj.animation_data.action if obj.animation_data else None
    if not action:
        return []
    try:
        return [fc for layer in action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
    except AttributeError:
        return list(action.fcurves)

ease = params["ease"]
for obj in (camera, product):
    for fc in fcurves_of(obj):
        for key in fc.keyframe_points:
            if ease == "linear":
                key.interpolation = "LINEAR"
            else:
                key.interpolation = "BEZIER"
                key.handle_left_type = key.handle_right_type = "AUTO_CLAMPED"
                key.easing = "AUTO"
        if ease == "ease-out" and len(fc.keyframe_points) >= 2:
            first = fc.keyframe_points[0]
            first.interpolation = "SINE"
            first.easing = "EASE_OUT"

# ---- probe and baked motion ----
probe = []
for obj in bpy.data.objects:
    for fc in fcurves_of(obj):
        keys = [[round((k.co[0] - 1) / fps, 4), k.interpolation, k.easing] for k in fc.keyframe_points]
        probe.append({"object": obj.name, "path": fc.data_path, "index": fc.array_index, "keys": keys})
baked = {"fps": fps, "frameStart": 1, "source": "design-pipeline product-turntable", "camera": [], "product": []}
for frame in range(1, last + 1):
    scene.frame_set(frame)
    cm = camera.matrix_world
    baked["camera"].append({"position": [round(v, 5) for v in cm.translation], "quaternion": [round(v, 6) for v in cm.to_quaternion()], "lens": camera.data.lens})
    baked["product"].append({"rotationZ": round(product.rotation_euler[2], 6)})
scene.frame_set(1)

bpy.ops.render.render(animation=True)
json.dump({"template": "product-turntable", "engine": scene.render.engine, "fps": fps, "frames": frames, "fcurves": probe}, open(os.path.join(out, "probe.json"), "w"), indent=1)
json.dump(baked, open(os.path.join(out, "motion.json"), "w"))
