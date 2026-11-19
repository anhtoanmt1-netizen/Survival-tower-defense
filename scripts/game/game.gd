extends Node2D
## Giai đoạn 2: bản đồ + nhân vật + slime đuổi theo (FlowField) + đợt quái cơ bản + thua cuộc.
## Chưa có tháp để tiêu diệt slime (Giai đoạn 3): hiện tại là chế độ "sống sót".

const T := GameConfig.TILE_SIZE

var map: MapData
var grid_path: GridPath
var player: Player
var camera: Camera2D
var ground: MapView
var back: MapView
var front: MapView
var monsters: MonsterManager
var waves: WaveManager
var joystick: VirtualJoystick
var hud: Label
var notice: Label
var id_edit: LineEdit
var menu_panel: PanelContainer
var over_panel: CenterContainer
var over_label: Label
var _run_time := 0.0
var _running := false
var _notice_t := 0.0


func _ready() -> void:
	ground = MapView.new()
	ground.layer = MapView.Layer.GROUND
	back = MapView.new()
	back.layer = MapView.Layer.BACK
	monsters = MonsterManager.new()
	player = Player.new()
	front = MapView.new()
	front.layer = MapView.Layer.FRONT
	waves = WaveManager.new()
	add_child(ground)
	add_child(back)
	add_child(monsters)
	add_child(player)
	add_child(front)
	add_child(waves)
	camera = Camera2D.new()
	camera.zoom = Vector2(1.8, 1.8)
	camera.position_smoothing_enabled = true
	player.add_child(camera)
	_build_ui()
	player.died.connect(_on_player_died)
	waves.wave_started.connect(_on_wave_started)
	load_map(MapId.random_id(GameConfig.DEFAULT_THEME, GameConfig.DEFAULT_MAP_SIZE))


func load_map(id: String) -> bool:
	var m := MapGenerator.generate(id)
	if m == null:
		_show_notice("Map ID không hợp lệ")
		return false
	map = m
	grid_path = GridPath.new(m)
	for v in [ground, back, front]:
		v.map = m
		v.player = player
	camera.limit_left = 0
	camera.limit_top = 0
	camera.limit_right = m.width * T
	camera.limit_bottom = m.height * T
	id_edit.text = m.map_id
	_start_run()
	return true


func _start_run() -> void:
	if map == null:
		return
	player.setup(map, grid_path, MapGenerator.center(map))
	camera.reset_smoothing()
	monsters.setup(map, player)
	waves.setup(monsters, map.gates[randi() % map.gates.size()])
	waves.start()
	_run_time = 0.0
	_running = true
	over_panel.visible = false


func _on_player_died() -> void:
	_running = false
	waves.active = false
	var t := int(_run_time)
	over_label.text = "Sống sót: %d:%02d\nĐã tới đợt: %d\nSlime đang có: %d" % [t / 60, t % 60, waves.wave, monsters.count()]
	over_panel.visible = true


func _on_wave_started(n: int) -> void:
	_show_notice("ĐỢT %d" % n)


func _show_notice(text: String) -> void:
	notice.text = text
	_notice_t = 2.5


func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	joystick = VirtualJoystick.new()
	joystick.anchor_top = 1.0
	joystick.anchor_bottom = 1.0
	joystick.offset_left = 40
	joystick.offset_top = -300
	joystick.offset_right = 300
	joystick.offset_bottom = -40
	layer.add_child(joystick)
	joystick.moved.connect(_on_joystick_moved)

	hud = Label.new()
	hud.position = Vector2(16, 10)
	_style_label(hud, 22)
	layer.add_child(hud)

	notice = Label.new()
	notice.anchor_left = 0.0
	notice.anchor_right = 1.0
	notice.offset_top = 110
	notice.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_style_label(notice, 44)
	notice.modulate.a = 0.0
	layer.add_child(notice)

	var menu_btn := _button("Menu", _on_menu_pressed)
	menu_btn.anchor_left = 1.0
	menu_btn.anchor_right = 1.0
	menu_btn.offset_left = -150
	menu_btn.offset_right = -16
	menu_btn.offset_top = 10
	menu_btn.offset_bottom = 62
	layer.add_child(menu_btn)

	menu_panel = PanelContainer.new()
	menu_panel.anchor_left = 1.0
	menu_panel.anchor_right = 1.0
	menu_panel.offset_left = -560
	menu_panel.offset_right = -16
	menu_panel.offset_top = 70
	menu_panel.visible = false
	layer.add_child(menu_panel)
	var vb := VBoxContainer.new()
	menu_panel.add_child(vb)
	id_edit = LineEdit.new()
	id_edit.add_theme_font_size_override("font_size", 22)
	vb.add_child(id_edit)
	var row := HBoxContainer.new()
	vb.add_child(row)
	row.add_child(_button("Tải ID", _on_load_pressed))
	row.add_child(_button("Sao chép ID", _on_copy_pressed))
	row.add_child(_button("Bản đồ mới", _on_new_map_pressed))

	over_panel = CenterContainer.new()
	over_panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	over_panel.visible = false
	layer.add_child(over_panel)
	var pc := PanelContainer.new()
	over_panel.add_child(pc)
	var ov := VBoxContainer.new()
	pc.add_child(ov)
	var title := Label.new()
	title.text = "THẤT BẠI"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 40)
	ov.add_child(title)
	over_label = Label.new()
	over_label.add_theme_font_size_override("font_size", 24)
	ov.add_child(over_label)
	ov.add_child(_button("Chơi lại (cùng bản đồ)", _start_run))
	ov.add_child(_button("Bản đồ mới", _on_new_map_pressed))


func _style_label(l: Label, size: int) -> void:
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_outline_color", Color.BLACK)
	l.add_theme_constant_override("outline_size", 8)


func _button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(0, 52)
	b.add_theme_font_size_override("font_size", 22)
	b.pressed.connect(cb)
	return b


func _on_joystick_moved(d: Vector2) -> void:
	player.joystick_dir = d


func _on_menu_pressed() -> void:
	menu_panel.visible = not menu_panel.visible


func _on_load_pressed() -> void:
	id_edit.release_focus()
	if load_map(id_edit.text):
		menu_panel.visible = false


func _on_copy_pressed() -> void:
	DisplayServer.clipboard_set(id_edit.text)
	_show_notice("Đã sao chép ID")


func _on_new_map_pressed() -> void:
	menu_panel.visible = false
	load_map(MapId.random_id(GameConfig.DEFAULT_THEME, GameConfig.DEFAULT_MAP_SIZE))


func _process(delta: float) -> void:
	if _running:
		_run_time += delta
	if _notice_t > 0.0:
		_notice_t -= delta
		notice.modulate.a = clampf(_notice_t / 0.6, 0.0, 1.0)
	if map == null:
		return
	var t := int(_run_time)
	hud.text = "HP %d/%d    Đợt %d/%d    Slime %d\nĐợt kế: %ds    Sống: %d:%02d    FPS %d" % [
		player.hp, Player.MAX_HP, waves.wave, WaveManager.TOTAL_WAVES, monsters.count(),
		maxi(int(ceil(waves.time_to_next)), 0), t / 60, t % 60, Engine.get_frames_per_second()]


func _unhandled_input(event: InputEvent) -> void:
	if map == null or not player.alive:
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if joystick.get_global_rect().has_point(event.position):
			return
		var c := Vector2i((get_global_mouse_position() / T).floor())
		if map.is_walkable(c):
			player.move_to_cell(c)
