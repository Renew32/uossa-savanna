import bpy, json, math
from pathlib import Path
base=Path(__file__).resolve().parent.parent
scene=bpy.data.scenes.new('UOSSA — Logo aux contours lisses')
if bpy.context.window: bpy.context.window.scene=scene
data=json.loads((base/'notes/logo-contours.json').read_text())
def linear(c):
 c=c/255
 return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
colors={k:tuple(linear(c) for c in rgb)+(1,) for k,rgb in {'gold':(219,169,35),'green':(7,86,47),'red':(188,22,60)}.items()}
for name,groups in data.items():
 mat=bpy.data.materials.new('UOSSA '+name);mat.diffuse_color=colors[name];mat.use_nodes=True
 bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=colors[name];bsdf.inputs['Metallic'].default_value=.64 if name=='gold' else .26;bsdf.inputs['Roughness'].default_value=.29
 curve=bpy.data.curves.new('Contours '+name,'CURVE');curve.dimensions='2D';curve.fill_mode='BOTH';curve.resolution_u=6;curve.extrude=.085 if name=='gold' else .06;curve.bevel_depth=.009;curve.bevel_resolution=2
 for group in groups:
  for points in [group['outer']]+group['holes']:
   spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
   for i,(p,xy) in enumerate(zip(spline.bezier_points,points)):
    p.co=(xy[0],xy[1],0)
    prev=points[(i-1)%len(points)];nxt=points[(i+1)%len(points)]
    a=(xy[0]-prev[0],xy[1]-prev[1]);b=(nxt[0]-xy[0],nxt[1]-xy[1])
    dot=(a[0]*b[0]+a[1]*b[1])/max(1e-9,math.hypot(*a)*math.hypot(*b))
    # Keep intentional sharp tips; interpolate continuous arcs smoothly.
    handle='VECTOR' if dot < .30 else 'AUTO'
    p.handle_left_type=handle;p.handle_right_type=handle
   spline.use_cyclic_u=True
 obj=bpy.data.objects.new('Logo '+name,curve);bpy.context.collection.objects.link(obj);obj.rotation_euler.x=math.pi/2;curve.materials.append(mat)
# Present the editable emblem in a material-colored front perspective.
from mathutils import Vector
area=bpy.context.area
if area:
 area.type='VIEW_3D'
 area.spaces.active.region_3d.view_location=(0,0,0)
 area.spaces.active.region_3d.view_distance=10
 area.spaces.active.region_3d.view_rotation=Vector((.25,-1,.15)).to_track_quat('Z','Y')
 area.spaces.active.shading.type='SOLID'
 area.spaces.active.shading.color_type='MATERIAL'
# Save an editable source, then export only the evaluated meshes.
bpy.ops.wm.save_as_mainfile(filepath=str(base/'notes/uossa-logo-relief.blend'))
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=bpy.context.selected_objects[0];bpy.ops.object.convert(target='MESH')
for obj in bpy.context.selected_objects:
 for poly in obj.data.polygons:poly.use_smooth=abs(poly.normal.z)<.999
bpy.ops.export_scene.gltf(filepath=str(base/'public/models/uossa-logo-relief.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)
print('Exported 3D UOSSA logo')
