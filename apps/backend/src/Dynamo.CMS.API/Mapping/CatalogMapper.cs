using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Models;
using Riok.Mapperly.Abstractions;

namespace Dynamo.CMS.API.Mapping;

[Mapper(
    UseDeepCloning = true,
    PropertyNameMappingStrategy = PropertyNameMappingStrategy.CaseInsensitive,
    EnumMappingStrategy = EnumMappingStrategy.ByName,
    EnumMappingIgnoreCase = true
    )]
public partial class CatalogMapper
{
    public partial DataCollectionDTO ToDataCollectionDTO(DataCollection dataCollection);

    [MapProperty(nameof(DataCollectionColumn.BaseTypeName), nameof(DataCollectionColumnDTO.BaseType))]
    public partial DataCollectionColumnDTO ToDataCollectionColumnDTO(DataCollectionColumn dataCollectionColumn);

}
