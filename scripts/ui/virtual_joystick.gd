class_name VirtualJoystick
extends Control
## Joystick ảo đa điểm: chỉ bám theo đúng ngón tay đã bấm vào vùng joystick.

signal moved(direction: Vector2)

@export var radius := 90.0
var _touch := -1
var _knob := Vector2.ZERO


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and _touch == -1 and get_global_rect().has_point(event.position):
			_touch = event.index
			_update(event.position)
			get_viewport().set_input_as_handled()
		elif not event.pressed and event.index == _touch:
			_touch = -1
			_knob = Vector2.ZERO
			moved.emit(Vector2.ZERO)
			queue_redraw()
	elif event is InputEventScreenDrag and event.index == _touch:
		_update(event.position)
		get_viewport().set_input_as_handled()


func _update(screen_pos: Vector2) -> void:
	var center := get_global_rect().get_center()
	_knob = (screen_pos - center).limit_length(radius)
	moved.emit(_knob / radius)
	queue_redraw()


func _draw() -> void:
	var c := size * 0.5
	draw_circle(c, radius, Color(0, 0, 0, 0.25))
	draw_arc(c, radius, 0.0, TAU, 48, Color(1, 1, 1, 0.5), 3.0)
	draw_circle(c + _knob, radius * 0.4, Color(1, 1, 1, 0.55))
