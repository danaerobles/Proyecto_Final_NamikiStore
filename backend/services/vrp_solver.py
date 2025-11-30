#!/usr/bin/env python3
import sys, json
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

# Lee JSON por stdin
raw = sys.stdin.read()
input_data = json.loads(raw)

# Estructura esperada en input_data:
# {
#  "locations": [{"lat":..., "lng":..., "demand":int, "window":[start_min, end_min]}],
#  "num_vehicles": int,
#  "vehicle_capacity": int,
#  "depot": 0
# }

def haversine_dist(a,b):
    import math
    R = 6371000
    lat1 = a['lat']*3.141592653589793/180.0
    lat2 = b['lat']*3.141592653589793/180.0
    dlat = lat2-lat1
    dlng = (b['lng']-a['lng'])*3.141592653589793/180.0
    x = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlng/2)**2
    return int(2*R*math.asin(math.sqrt(x)))

locations = input_data.get('locations', [])
if len(locations) == 0:
    print(json.dumps({'status':'error','msg':'no locations'}))
    sys.exit(0)

# Dist matrix
n = len(locations)
matrix = [[0]*n for _ in range(n)]
for i in range(n):
    for j in range(n):
        if i==j: continue
        matrix[i][j] = haversine_dist(locations[i], locations[j])

num_vehicles = input_data.get('num_vehicles', 3)
vehicle_capacity = input_data.get('vehicle_capacity', 1000)
depot = input_data.get('depot', 0)

# OR-Tools data model
data = {}
data['distance_matrix'] = matrix
data['num_vehicles'] = num_vehicles
data['depot'] = depot

manager = pywrapcp.RoutingIndexManager(len(data['distance_matrix']), data['num_vehicles'], data['depot'])
routing = pywrapcp.RoutingModel(manager)

# Distance callback
def distance_callback(from_index, to_index):
    from_node = manager.IndexToNode(from_index)
    to_node = manager.IndexToNode(to_index)
    return data['distance_matrix'][from_node][to_node]
transit_cb_idx = routing.RegisterTransitCallback(distance_callback)
routing.SetArcCostEvaluatorOfAllVehicles(transit_cb_idx)

# Capacity (demand)
demands = [int(loc.get('demand',0)) for loc in locations]

def demand_callback(from_index):
    from_node = manager.IndexToNode(from_index)
    return demands[from_node]

demand_cb_idx = routing.RegisterUnaryTransitCallback(demand_callback)
routing.AddDimensionWithVehicleCapacity(demand_cb_idx, 0, [vehicle_capacity]*num_vehicles, True, 'Capacity')

# Time windows: asumimos ventana en minutos desde 0 (ej: jornada 8:00 -> 480)
travel_time_factor = 1/1000.0

time_windows = [loc.get('window', [0, 24*60]) for loc in locations]

def time_callback(from_index, to_index):
    from_node = manager.IndexToNode(from_index)
    to_node = manager.IndexToNode(to_index)
    dist = data['distance_matrix'][from_node][to_node]
    return int(dist * travel_time_factor)
time_cb_idx = routing.RegisterTransitCallback(time_callback)
routing.AddDimension(time_cb_idx, 60, 24*60, False, 'Time')
time_dimension = routing.GetDimensionOrDie('Time')
for i, window in enumerate(time_windows):
    index = manager.NodeToIndex(i)
    time_dimension.CumulVar(index).SetRange(window[0], window[1])

# Parámetros de búsqueda
search_parameters = pywrapcp.DefaultRoutingSearchParameters()
search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
search_parameters.time_limit.FromSeconds(10)

solution = routing.SolveWithParameters(search_parameters)
if not solution:
    print(json.dumps({'status':'no_solution'}))
    sys.exit(0)

routes = []
for v in range(num_vehicles):
    idx = routing.Start(v)
    route = []
    while not routing.IsEnd(idx):
        node = manager.IndexToNode(idx)
        route.append(node)
        idx = solution.Value(routing.NextVar(idx))
    routes.append(route)

print(json.dumps({'status':'ok','routes':routes}))