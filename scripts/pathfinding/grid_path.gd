class_name GridPath
extends RefCounted
## Bọc AStarGrid2D. Dùng chung quy tắc địa hình (MapData.is_walkable) cho
## người chơi, và sau này cho kiểm tra xây tháp + AI quái.

var _astar := AStarGrid2D.new()
var _map: MapData


func _init(map: MapData) -> void:
	_map = map
	_astar.region = Rect2i(0, 0, map.width, map.height)
	_astar.cell_size = Vector2.ONE
	_astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	_astar.default_compute_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	_astar.default_estimate_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	_astar.update()
	for y in map.height:
		for x in map.width:
			if not map.is_walkable(Vector2i(x, y)):
				_astar.set_point_solid(Vector2i(x, y), true)


func set_blocked(c: Vector2i, blocked: bool) -> void:
	if _map.in_bounds(c):
		_astar.set_point_solid(c, blocked)


func is_blocked(c: Vector2i) -> bool:
	return not _map.in_bounds(c) or _astar.is_point_solid(c)


func find_path(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	if is_blocked(from) or is_blocked(to):
		return out
	for c in _astar.get_id_path(from, to):
		out.append(c)
	return out


func has_path(from: Vector2i, to: Vector2i) -> bool:
	return not find_path(from, to).is_empty()
